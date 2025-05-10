import { ID, ImageDefinition, Account, BinaryCoStream } from 'jazz-tools';

export async function handleImageRequest(req: Request, worker: Account) {
  console.log(new Date(), req.url);
  const imageFileId = req.url.split('/image/')[1];
  console.log(new Date(), imageFileId);

  const imageFile = await ImageDefinition.load(
    imageFileId as ID<ImageDefinition>
  );

  if (!imageFile) return new Response('not found', { status: 404 });

  const highestRes =
    `${imageFile.originalSize[0]}x${imageFile?.originalSize[1]}` as const;
  const highestResStreamID = imageFile._refs[highestRes]?.id;
  if (!highestResStreamID) {
    console.error(new Date(), 'no stream for highest res', imageFile);
    return new Response('not found - no stream for highest res', {
      status: 404,
    });
  }

  const highestResBlob = await BinaryCoStream.loadAsBlob(highestResStreamID);

  if (!highestResBlob) {
    console.error(new Date(), "couldn't load image as blob");
    return new Response("couldn't load image as blob", { status: 500 });
  }

  return new Response(highestResBlob, {
    headers: {
      'Content-Type': highestResBlob.type || 'application/octet-stream',
    },
  });
}
