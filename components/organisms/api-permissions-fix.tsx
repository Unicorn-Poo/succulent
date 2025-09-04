'use client';

import { Button } from '@/components/atoms/button';
import { useState } from 'react';

interface APIPermissionsFixProps {
  accountGroup: any;
}

export default function APIPermissionsFix({ accountGroup }: APIPermissionsFixProps) {
  const [isFixing, setIsFixing] = useState(false);
  const [isFixed, setIsFixed] = useState(false);

  const handleFixPermissions = async () => {
    if (!accountGroup || !process.env.NEXT_PUBLIC_JAZZ_WORKER_ACCOUNT) {
      alert('Account group or server worker not available');
      return;
    }

    setIsFixing(true);
    try {
      const { Account } = await import('jazz-tools');
      const worker = await Account.load(process.env.NEXT_PUBLIC_JAZZ_WORKER_ACCOUNT);
      
      if (worker && accountGroup._owner) {
        accountGroup._owner.addMember(worker, 'writer');
        setIsFixed(true);
        alert('✅ Server worker permissions added! API posts should now appear in this account group.');
      } else {
        alert('❌ Could not load server worker or account group owner');
      }
    } catch (error) {
      alert('❌ Failed to add permissions: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsFixing(false);
    }
  };

  if (isFixed) {
    return (
      <Button variant="outline" size="1" disabled>
        ✅ API Permissions Fixed
      </Button>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="1" 
      onClick={handleFixPermissions}
      disabled={isFixing}
    >
      {isFixing ? 'Fixing...' : 'Fix API Permissions'}
    </Button>
  );
} 