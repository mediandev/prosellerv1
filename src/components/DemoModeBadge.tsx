import { useEffect, useState } from 'react';
import { Badge } from './ui/badge';
import { AlertCircle } from 'lucide-react';
import { getAuthToken } from '../services/api';

export function DemoModeBadge() {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    setIsDemoMode(token?.startsWith('mock_token_') || false);
  }, []);

  if (!isDemoMode) {
    return null;
  }

  return (
    <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700 gap-1">
      <AlertCircle className="h-3 w-3" />
      Modo Demo
    </Badge>
  );
}
