import { useQueries } from '@tanstack/react-query';
import {
  useELSProject,
  useELSContent,
  useELSAnalysis,
  useELSDesign,
  useELSAIGeneration,
  useELSImplementation,
  useELSAnalytics,
  useELSGovernance,
} from '.';

/**
 * Combined hook to fetch all ELS data for a project
 * Useful for the main ELS Studio view
 */
export function useELSProjectData(
  orgId: string,
  projectId: string,
  options?: { enabled?: boolean }
) {
  const projectQuery = useELSProject(orgId, projectId, options);
  const contentQuery = useELSContent(orgId, projectId, {
    enabled: options?.enabled !== false && !!projectQuery.data,
  });
  const analysisQuery = useELSAnalysis(orgId, projectId, {
    enabled: options?.enabled !== false && !!projectQuery.data,
  });
  const designQuery = useELSDesign(orgId, projectId, {
    enabled: options?.enabled !== false && !!projectQuery.data,
  });
  const generationQuery = useELSAIGeneration(orgId, projectId, {
    enabled: options?.enabled !== false && !!projectQuery.data,
  });
  const implementationQuery = useELSImplementation(orgId, projectId, {
    enabled: options?.enabled !== false && !!projectQuery.data,
  });
  const analyticsQuery = useELSAnalytics(orgId, projectId, {
    enabled: options?.enabled !== false && !!projectQuery.data,
  });
  const governanceQuery = useELSGovernance(orgId, projectId, {
    enabled: options?.enabled !== false && !!projectQuery.data,
  });

  const isLoading =
    projectQuery.isLoading ||
    contentQuery.isLoading ||
    analysisQuery.isLoading ||
    designQuery.isLoading ||
    generationQuery.isLoading ||
    implementationQuery.isLoading ||
    analyticsQuery.isLoading ||
    governanceQuery.isLoading;

  const isError =
    projectQuery.isError ||
    contentQuery.isError ||
    analysisQuery.isError ||
    designQuery.isError ||
    generationQuery.isError ||
    implementationQuery.isError ||
    analyticsQuery.isError ||
    governanceQuery.isError;

  return {
    // Data
    project: projectQuery.data,
    content: contentQuery.data || [],
    analysis: analysisQuery.data,
    design: designQuery.data,
    generation: generationQuery.data,
    implementation: implementationQuery.data,
    analytics: analyticsQuery.data,
    governance: governanceQuery.data,

    // Status
    isLoading,
    isError,
    error:
      projectQuery.error ||
      contentQuery.error ||
      analysisQuery.error ||
      designQuery.error ||
      generationQuery.error ||
      implementationQuery.error ||
      analyticsQuery.error ||
      governanceQuery.error,

    // Refetch functions
    refetch: () => {
      projectQuery.refetch();
      contentQuery.refetch();
      analysisQuery.refetch();
      designQuery.refetch();
      generationQuery.refetch();
      implementationQuery.refetch();
      analyticsQuery.refetch();
      governanceQuery.refetch();
    },
  };
}
