const createList = () => ({
  create: () => [] as any,
});

const createRecord = () => ({
  create: () => ({} as any),
});

export const co = {
  list: () => createList(),
  record: () => createRecord(),
  plainText: () => ({
    create: (value: string) => ({ toString: () => value }),
  }),
};

const createStringChain = () => {
  const chain: any = {};
  chain.min = () => chain;
  chain.optional = () => chain;
  chain.default = () => chain;
  return chain;
};

export const z = {
  string: () => createStringChain(),
};

export class Group {}
