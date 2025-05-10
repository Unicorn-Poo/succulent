import { Account, CoMap, Profile, co } from 'jazz-tools';
import {
  ListOfBrands,
  ListOfHashtagGroups,
  ListOfUsertagGroups,
  MetaAPIConnection,
} from './sharedDataModel';
import { insightTypes } from './pages/settings/PreferencesPage';

export class AccountRoot extends CoMap {
  brands = co.ref(ListOfBrands);
  settings = co.ref(Settings);
  metaAPIConnection? = co.ref(MetaAPIConnection, { optional: true });
}

export class Settings extends CoMap {
  perBrand = co.ref(SettingsPerBrand);
}

export class PersonalBrandSettings extends CoMap {
  postInsightsOrder = co.json<(typeof insightTypes)[number][]>();
}

export class SettingsPerBrand extends CoMap.Record(
  co.ref(PersonalBrandSettings)
) {}

export class SucculentAccount extends Account {
  profile = co.ref(Profile);
  root = co.ref(AccountRoot);

  async migrate(this: SucculentAccount, creationProps?: { name: string }) {
    super.migrate(creationProps);
    if (!this._refs.root) {
      this.root = AccountRoot.create(
        {
          brands: ListOfBrands.create([], { owner: this }),
          settings: Settings.create(
            {
              perBrand: SettingsPerBrand.create({}, { owner: this }),
            },
            { owner: this }
          ),
        },
        { owner: this }
      );
    }
    const root = (await this.ensureLoaded({ resolve: { root: true } }))!.root;
    if (!root._refs.settings) {
      root.settings = Settings.create(
        {
          perBrand: SettingsPerBrand.create({}, { owner: this }),
        },
        { owner: this }
      );
    }
    const rootWithBrands = await root.ensureLoaded({
      resolve: { brands: { $each: true } },
    });
    if (!rootWithBrands) throw new Error('rootWithBrands not loaded');

    for (const brand of rootWithBrands.brands) {
      if (!brand._refs.hashtagGroups) {
        brand.hashtagGroups = ListOfHashtagGroups.create([], {
          owner: brand._owner,
        });
      }
      if (!brand._refs.usertagGroups) {
        brand.usertagGroups = ListOfUsertagGroups.create([], {
          owner: brand._owner,
        });
      }
    }
  }
}

declare module 'jazz-react' {
  interface Register {
    Account: SucculentAccount;
  }
}
