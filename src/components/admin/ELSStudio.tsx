import ELSStudioComponent from '../els/ELSStudioIntegrated';
import { ELSProvider } from '@/context/ELSContext';

interface ELSStudioProps {
  isDarkMode?: boolean;
}

export default function ELSStudio({ isDarkMode = false }: ELSStudioProps) {
  return (
    <ELSProvider>
      <ELSStudioComponent isDarkMode={isDarkMode} />
    </ELSProvider>
  );
}
