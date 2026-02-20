import React from 'react';
import { Outlet } from 'react-router-dom';
import { BotPipelineProvider } from '../../../context/BotPipelineContext';

const BotLayout: React.FC = () => {
  return (
    <BotPipelineProvider>
      <Outlet />
    </BotPipelineProvider>
  );
};

export default BotLayout;
