import { useAccount, useCoState } from 'jazz-react';
import { MetaAPIConnection } from '@/sharedDataModel';
import { ID } from 'jazz-tools';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function AddNewMetaConnection() {
  const connectionId = useParams<{ connectionId: ID<MetaAPIConnection> }>()
    .connectionId;
  const { me } = useAccount();
  const connection = useCoState(MetaAPIConnection, connectionId);
  const navigate = useNavigate();

  useEffect(() => {
    if (me.root && connection) {
      if (me.root.metaAPIConnection?.id !== connection.id) {
        me.root.metaAPIConnection = connection;
      }
      navigate('/');
    }
  }, [me, connection, navigate]);

  return 'Connecting...';
}
