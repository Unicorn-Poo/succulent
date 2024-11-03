import { ActuallyScheduled } from '.';
import { CojsonInternalTypes, SessionID } from 'cojson';
import { SchedulerAccount, SchedulerAccountRoot } from './workerAccount';

export function handleStateRequest(
  req: Request,
  worker: SchedulerAccount,
  actuallyScheduled: ActuallyScheduled,
  lastWorkerUpdate: SchedulerAccountRoot | null
) {
  return new Response(
    `<body style="color: white; background-color: black;"><h1>Jazz State</h1>` +
      Object.values(worker._raw.core.node.syncManager.peers)
        .map((peer) => `<p>${peer.id}</p>`)
        .join('') +
      `<h2>Actually Scheduled</h2><table>` +
      [...actuallyScheduled.entries()]
        .map(([id, entry]) => `<tr><td>${id}</td><td>${entry.state}</td></tr>`)
        .join('') +
      '</table>' +
      lastWorkerUpdate?.brands
        ?.map(
          (brand) =>
            `<h2>${brand?.name} (${brand?.instagramPage
              ?.id})</h2>${Object.values(
              worker._raw.core.node.syncManager.peers
            )
              .map(
                (peer) =>
                  '<p>' +
                  (brand?.posts &&
                    missingTxsComparedTo(
                      brand.posts._raw.core.knownState(),
                      peer.optimisticKnownStates[brand.posts.id]
                    )) +
                  ' behind</p>'
              )
              .join(
                ''
              )}<table style="font-size: 10px; font-family: monospace; border: 1px solid white; border-spacing: 8px;">` +
            brand?.posts
              ?.toSorted((a, b) => {
                if (!a) return 1;
                if (!b) return -1;
                // sort by scheduledAt/postedAt
                const dateA = new Date(
                  a.instagram?.state === 'posted'
                    ? a.instagram?.postedAt
                    : (a.instagram &&
                        'scheduledAt' in a.instagram &&
                        a.instagram?.scheduledAt) ||
                      new Date()
                );
                const dateB = new Date(
                  b.instagram?.state === 'posted'
                    ? b.instagram?.postedAt
                    : (b.instagram &&
                        'scheduledAt' in b.instagram &&
                        b.instagram?.scheduledAt) ||
                      new Date()
                );
                return dateA > dateB ? -1 : 1;
              })
              ?.map(
                (post) =>
                  `<tr>
    <td style="max-width: 15rem; white-space: nowrap; overflow: scroll;">${post?.content}</td>
    <td>${post?.instagram?.state}</td>
    <td>${Object.values(worker._raw.core.node.syncManager.peers)
      .map(
        (peer) =>
          (post &&
            missingTxsComparedTo(
              post._raw.core.knownState(),
              peer.optimisticKnownStates[post.id]
            )) + ' behind'
      )
      .join(',')}</td>
    <td>${
      post?.instagram?.state === 'posted'
        ? new Date(post.instagram.postedAt).toLocaleString()
        : post?.instagram?.state === 'notScheduled'
          ? '--'
          : post?.instagram?.scheduledAt &&
            new Date(post?.instagram.scheduledAt).toLocaleString()
    }</td>
    <td>images: ${
      post?.images
        ?.map(
          (image) =>
            `<a href="/image/${image?._refs.imageFile.id}">${
              image?._refs.imageFile.value &&
              image.imageFile &&
              image.imageFile._refs[
                `${image.imageFile.originalSize[0]}x${image.imageFile.originalSize[1]}`
              ]?.value
                ? '✅'
                : '❌'
            }</a>`
        )
        .join('') || '...'
    }</td>
    <td>${post?.id}</td>
</tr>`
              )
              .join('') +
            '</table>'
        )
        .join(''),
    {
      headers: {
        'Content-Type': 'text/html',
      },
    }
  );
}

function missingTxsComparedTo(
  ours: CojsonInternalTypes.CoValueKnownState,
  theirs: CojsonInternalTypes.CoValueKnownState
): number {
  if (!theirs.header && ours.header) {
    return 0;
  }

  const allSessions = new Set([
    ...Object.keys(ours.sessions),
    ...Object.keys(theirs.sessions),
  ]);

  return [...allSessions].reduce((acc, session) => {
    return (
      acc +
      Math.max(
        0,
        (theirs.sessions[session as SessionID] || 0) -
          (ours.sessions[session as SessionID] || 0)
      )
    );
  }, 0);
}
