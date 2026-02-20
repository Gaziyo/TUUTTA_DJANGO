import React from 'react';

interface AudioPlayerProps {
  audioSrc: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioSrc }) => {
  return (
    <audio controls>
      <source src={audioSrc} type="audio/mp3" />
      Your browser does not support the audio element.
    </audio>
  );
};

export default AudioPlayer;