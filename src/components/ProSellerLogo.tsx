import logoImage from 'figma:asset/75d88e6ebbed3c5d3883e171899d73a54d97489c.png';

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
      src={logoImage} 
      alt="ProSeller" 
      className={`${sizeClasses[size]} ${className}`}
    />
  );
}