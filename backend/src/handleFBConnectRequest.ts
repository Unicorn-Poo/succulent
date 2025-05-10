import { ID, Group, Account } from 'jazz-tools';
import { Brand, MetaAPIConnection } from './sharedDataModel';
import { SchedulerAccount } from './workerAccount';

export async function handleFBConnectRequest(
  req: Request,
  worker: SchedulerAccount
) {
  const code = new URL(req.url).searchParams.get('code');
  console.log(
    new Date(),
    'got connect code',
    code,
    new URL(req.url).searchParams.get('state')
  );

  if (!code) return new Response('no code');

  const shortLivedResult = await (
    await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${
        process.env.FB_CLIENT_ID
      }&redirect_uri=${encodeURIComponent(
        (process.env.SUCCULENT_BACKEND_ADDR || 'http://localhost:3331') +
          '/connectFB'
      )}&client_secret=${process.env.FB_CLIENT_SECRET}&code=${code}`
    )
  ).json();

  console.log(new Date(), 'shortLivedResult', shortLivedResult);

  const longLivedResult = await (
    await fetch(
      `https://graph.facebook.com/v2.3/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FB_CLIENT_ID}&client_secret=${process.env.FB_CLIENT_SECRET}&fb_exchange_token=${shortLivedResult.access_token}`
    )
  ).json();

  console.log(new Date(), 'longLivedResult', longLivedResult);

  const connectionOwnerId = new URL(req.url).searchParams.get('state');
  if (!connectionOwnerId)
    return new Response('no connectionOwnerId', { status: 400 });

  const connectionOwner = await Account.load(connectionOwnerId as ID<Account>);
  if (!connectionOwner)
    return new Response('no connectionOwner', { status: 500 });

  const connectionGroup = Group.create({ owner: worker });
  connectionGroup.addMember(connectionOwner, 'reader');

  const newConnection = MetaAPIConnection.create(
    {
      longLivedToken: longLivedResult.access_token,
      validUntil: new Date(
        Date.now() + (longLivedResult.expires_in || 30 * 24 * 60 * 60) * 1000
      ),
    },
    { owner: connectionGroup }
  );

  console.log('Syncing new connection', newConnection);

  await worker._raw.core.node.syncManager.syncCoValue(newConnection._raw.core);

  // redirect to frontend
  return Response.redirect(
    (process.env.SUCCULENT_FRONTEND_ADDR || 'http://localhost:3889/') +
      '#/newMetaConnection/' +
      newConnection.id
  );
}
