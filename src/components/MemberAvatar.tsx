import React, { useState } from 'react';

interface MemberAvatarProps {
  avatarUrl?: string | null;
  username?: string | null;
  sizeClass: string;
  fallbackGradient: string;
  textClass: string;
  altText?: string;
}

const MemberAvatar: React.FC<MemberAvatarProps> = ({
  avatarUrl,
  username,
  sizeClass,
  fallbackGradient,
  textClass,
  altText,
}) => {
  const [imgError, setImgError] = useState(false);
  const showImage = avatarUrl && !imgError;
  const initial = (username || 'M').charAt(0).toUpperCase();

  return (
    <div className={`${sizeClass} ${fallbackGradient} rounded-full flex items-center justify-center overflow-hidden`}>
      {showImage ? (
        <img
          src={avatarUrl!}
          alt={altText || username || 'Member'}
          className={`${sizeClass} rounded-full object-cover`}
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={textClass}>
          {initial}
        </span>
      )}
    </div>
  );
};

export default MemberAvatar;
