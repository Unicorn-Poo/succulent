import { ID, ImageDefinition, DeeplyLoaded } from 'jazz-tools';
import { syncedWithAllPeers } from './missingTxsComparedTo';
import { Post } from './sharedDataModel';
import { SchedulerAccount } from './workerAccount';
import {
  ContainerField,
  Client as IGClient,
  PublicMediaField,
} from 'instagram-graph-api';

const backendAddr =
  process.env.SUCCULENT_BACKEND_ADDR || 'http://localhost:3331';

export class PostHandler {
  worker: SchedulerAccount;
  postID: ID<Post>;
  posting: boolean = false;
  lastValidState:
    | DeeplyLoaded<Post, { images: [{}]; userTags: {} }>
    | undefined;
  cancelSubscription: () => void;
  interval: ReturnType<typeof setInterval> | undefined;
  client: IGClient;

  constructor(worker: SchedulerAccount, postID: ID<Post>, client: IGClient) {
    this.worker = worker;
    this.postID = postID;
    this.client = client;

    console.log(new Date(), 'creating post handler', this.postID);

    this.cancelSubscription = Post.subscribe(
      postID,
      worker,
      { images: [{}], userTags: {} },
      (post) => {
        if (
          syncedWithAllPeers(post) &&
          post.images &&
          syncedWithAllPeers(post.images) &&
          post.images.length > 0 &&
          (post.userTags === undefined ||
            (post.userTags && syncedWithAllPeers(post.userTags)))
        ) {
          if (post.instagram.state === 'posted') {
            if (this.interval) {
              clearInterval(this.interval);
              this.interval = undefined;
            }
            return;
          }
          this.lastValidState = post;
          if (
            post.instagram.state === 'scheduleDesired' &&
            !post.instagram.notScheduledReason
          ) {
            post.instagram = {
              state: 'scheduled',
              scheduledAt: post.instagram.scheduledAt,
            };
          }

          if (!this.interval) {
            this.interval = setInterval(() => {
              this.progress();
            }, 10000);
          }
        }
      }
    );
  }

  cancel() {
    console.log(new Date(), 'cancelling post handler', this.postID);
    this.cancelSubscription();
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private progress() {
    if (!this.lastValidState) return;

    const post = this.lastValidState;

    if (this.posting) {
      console.log(new Date(), 'still posting...', this.postID);
      return;
    }

    if (post.instagram.state === 'scheduled') {
      const now = new Date();
      const scheduledAt = new Date(post.instagram.scheduledAt);
      const diff = scheduledAt.getTime() - now.getTime();

      // ignore posts that are scheduled more than 5 minutes in the past
      if (diff < 0 && diff > -5 * 60 * 1000) {
        this.posting = true;

        this.actuallyPost(post)
          .then(({ postId, permalink }) => {
            post.instagram = {
              state: 'posted',
              postedAt: new Date().toISOString(),
              postId,
              permalink,
            };
          })
          .catch((e) => {
            console.error(new Date(), 'error posting', this.postID, e);
            post.instagram = {
              state: 'scheduleDesired',
              scheduledAt: scheduledAt.toISOString(),
              notScheduledReason: e.toString(),
            };
          })
          .finally(() => {
            this.posting = false;
          });
      }
    }
  }

  private async actuallyPost(
    post: DeeplyLoaded<Post, { images: [{}]; userTags: {} }>
  ) {
    let topLevelContainerID: string | undefined;

    if (post.images.length === 1 && post.images[0]?._refs.imageFile.id) {
      topLevelContainerID = await this.createContainerFromImage(
        post.id,
        post.images[0]._refs.imageFile.id,
        post.content || '',
        post.userTags
      );
    } else if (post.images.length > 1) {
      topLevelContainerID = await this.createCarouselFromImages(
        post,
        post.content || '',
        post.userTags
      );
    } else {
      throw new Error('no images to post');
    }

    console.log(new Date(), 'publishing', post.id, topLevelContainerID);

    const publishRequest = await this.client
      .newPostPublishMediaRequest(topLevelContainerID)
      .execute();

    console.log(new Date(), 'published', post.id, publishRequest.getId());

    const permalinkInfo = await this.client
      .newGetMediaInfoRequest(
        publishRequest.getId(),
        PublicMediaField.PERMALINK
      )
      .execute();
    if (!permalinkInfo.getPermalink()) {
      console.error(new Date(), 'no permalink', this.postID);
    }

    console.log(
      new Date(),
      'got permalink',
      this.postID,
      permalinkInfo.getPermalink()
    );

    return {
      postId: publishRequest.getId(),
      permalink: permalinkInfo.getPermalink() || '',
    };
  }

  private async createContainerFromImage(
    postId: ID<Post>,
    imageId: ID<ImageDefinition>,
    content: string,
    userTags: Record<string, { x: number; y: number }> = {}
  ) {
    console.log(new Date(), 'creating container from image', postId, imageId);
    const containerRequest = await this.client
      .newPostPagePhotoMediaRequest(
        backendAddr + '/image/' + imageId,
        content,
        undefined,
        Object.entries(userTags).map(([username, { x, y }]) => ({
          username,
          x,
          y,
        }))
      )
      .execute();

    const containerID = containerRequest.getId();

    if (!containerID) {
      console.error(
        new Date(),
        'no container ID',
        postId,
        imageId,
        containerRequest.getData()
      );
      throw new Error(
        (containerRequest.getData() as any).error.error_user_title
      );
    }

    console.log(new Date(), 'created container', postId, imageId, containerID);

    let containerReady = false;

    while (!containerReady) {
      const containerStatus = (
        await this.client
          .newGetContainerRequest(containerID, ContainerField.STATUS)
          .execute()
      ).getContainerStatus();
      containerReady = containerStatus === 'FINISHED';
      if (!containerReady) {
        console.log(
          new Date(),
          'container not yet ready...',
          postId,
          imageId,
          containerStatus,
          containerID
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(new Date(), 'container ready', imageId, containerID);

    return containerID;
  }

  private async createCarouselFromImages(
    post: DeeplyLoaded<Post, { images: [{}]; userTags: {} }>,
    content: string,
    userTags: Record<string, { x: number; y: number }> = {}
  ) {
    console.log(
      new Date(),
      'creating carousel from images',
      post.id,
      post.images.map((i) => i.id)
    );
    const containerIDs = await Promise.all(
      post.images.map((image) =>
        this.createContainerFromImage(
          post.id,
          image._refs.imageFile.id,
          content,
          userTags
        )
      )
    );

    console.log(
      new Date(),
      'created carousel from images, creating top-level container',
      post.id
    );

    const topContainerRequest = await this.client
      .newPostPageCarouselMediaRequest(containerIDs, content)
      .execute();

    console.log(
      new Date(),
      'created top-level container',
      post.id,
      topContainerRequest.getId()
    );

    let topContainerReady = false;
    while (!topContainerReady) {
      topContainerReady =
        (
          await this.client
            .newGetContainerRequest(
              topContainerRequest.getId(),
              ContainerField.STATUS
            )
            .execute()
        ).getContainerStatus() === 'FINISHED';
      if (!topContainerReady) {
        console.log(
          new Date(),
          'top-level container not yet ready...',
          post.id,
          topContainerRequest.getId()
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(
      new Date(),
      'top-level container ready',
      post.id,
      topContainerRequest.getId()
    );

    return topContainerRequest.getId();
  }
}
