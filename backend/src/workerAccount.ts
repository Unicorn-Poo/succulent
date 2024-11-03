import { Group, co, CoMap, CoStream, Account, Profile, ID } from 'jazz-tools';
import { Brand, ListOfBrands, Post } from './sharedDataModel';

export class SchedulerAccountRoot extends CoMap {
  brands = co.ref(ListOfBrands);
}

export class ScheduledPosts extends CoStream.Of(co.ref(Post)) {}

export class SchedulerAccount extends Account {
  profile = co.ref(Profile);
  root = co.ref(SchedulerAccountRoot);

  async migrate(creationProps?: { name: string }) {
    super.migrate(creationProps);
    if (!this._refs.root) {
      this.root = SchedulerAccountRoot.create(
        {
          brands: ListOfBrands.create([], { owner: this }),
        },
        { owner: this }
      );
    }
    // const root = await this._refs.root?.load();
    // const brands = await root?._refs.brands.load();
    // brands?.push({id: "co_zEHJW7cDeDbsodNbMjkByKubqun"} as unknown as Brand)
  }
}
