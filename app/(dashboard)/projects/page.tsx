// Projects listing page with create dialog
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/page-transition";
import { ProjectsTable } from "@/features/projects/components/projects-table";
import { CreateProjectDialog } from "@/features/projects/components/create-project-dialog";
import {
  useProjects,
  useCreateProject,
  useDeleteProject,
} from "@/features/projects/hooks/use-projects";
import type { ProjectFormValues } from "@/lib/validations";

export default function ProjectsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { projects, loading, refetch } = useProjects();
  const { createProject, loading: creating } = useCreateProject();
  const { deleteProject } = useDeleteProject();

  const handleCreate = async (data: ProjectFormValues) => {
    const result = await createProject(data);
    if (result) {
      toast.success(`Project "${result.name}" created`);
      setDialogOpen(false);
      refetch();
    } else {
      toast.error("Failed to create project");
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteProject(id);
    if (success) {
      toast.success("Project deleted");
      refetch();
    } else {
      toast.error("Failed to delete project");
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Manage your storage projects and their configuration.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 size-4" />
            New Project
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : (
              <ProjectsTable projects={projects} onDelete={handleDelete} />
            )}
          </CardContent>
        </Card>

        <CreateProjectDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleCreate}
          loading={creating}
        />
      </div>
    </PageTransition>
  );
}
