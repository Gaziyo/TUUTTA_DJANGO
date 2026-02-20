import React from 'react';
import { Outlet } from 'react-router-dom';
import { GuidedPipelineProvider } from '../../../context/GuidedPipelineContext';

const GenieGuidedLayout: React.FC = () => {
  return (
    <GuidedPipelineProvider>
      <Outlet />
    </GuidedPipelineProvider>
  );
};

export default GenieGuidedLayout;
