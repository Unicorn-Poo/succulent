import { CojsonInternalTypes, SessionID } from 'cojson';
import { CoValue } from 'jazz-tools';

export function missingTxsComparedTo(
  ours: CojsonInternalTypes.CoValueKnownState,
  theirs: CojsonInternalTypes.CoValueKnownState | undefined
): number {
  if (!theirs || (!theirs.header && ours.header)) {
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

export function syncedWithAllPeers(value: CoValue): boolean {
  const peers = Object.values(value._raw.core.node.syncManager.peers);

  return (
    peers.length > 0 &&
    peers.every((peer) => {
      return (
        missingTxsComparedTo(
          value._raw.core.knownState(),
          peer.optimisticKnownStates.get(value.id)
        ) === 0
      );
    })
  );
}
