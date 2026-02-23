// Hook for fetching, creating, updating, and deleting projects
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Project, ProjectFormData } from "@/lib/types";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, error, refetch: fetchProjects };
}

export function useCreateProject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = async (data: ProjectFormData): Promise<Project | null> => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create project");
      }
      return await res.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createProject, loading, error };
}

export function useDeleteProject() {
  const [loading, setLoading] = useState(false);

  const deleteProject = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
      return res.ok;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { deleteProject, loading };
}
