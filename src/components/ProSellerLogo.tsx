const LOGO_URL = 'https://xxoiqfraeolsqsmsheue.supabase.co/storage/v1/object/public/file/ProSeller.png';

interface ProSellerLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ProSellerLogo({ className = '', size = 'md' }: ProSellerLogoProps) {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12'
  };

  return (
    <img 
      src={LOGO_URL} 
      alt="ProSeller" 
      className={`${sizeClasses[size]} ${className}`}
    />
  );
}