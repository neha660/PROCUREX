import { useOutletContext } from "react-router-dom";
import type { usePipeline } from "./usePipeline";

export type PipelineContextValue = ReturnType<typeof usePipeline> & {
  openCreateBrief: () => void;
};

export function usePipelineContext() {
  return useOutletContext<PipelineContextValue>();
}
