import { useMockApi } from "./client";

export const isMockMode = () => useMockApi;
export const canPreview = () => import.meta.env.DEV;
