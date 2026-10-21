"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, PlusIcon } from "lucide-react";
import {
  ACTIVE_STAGES,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  SOURCES,
  SOURCE_LABELS,
  STAGE_LABELS,
  TERMINAL_STAGES,
  WORK_MODES,
  WORK_MODE_LABELS,
} from "@/lib/constants";
import { todayDateOnly } from "@/lib/dates";
import { unwrap } from "@/lib/action-result";
import { addCategoryAction, createApplicationAction, updateApplicationAction } from "@/lib/actions";
import type { Application, Category } from "@/lib/types";
import { LIMITS, validateApplication, type ApplicationFormValues, type FormErrors } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField, SelectInput, fieldA11y, optionsFrom } from "@/components/shared/form-field";

function toFormValues(app: Application | undefined): ApplicationFormValues {
  if (!app) {
    return {
      companyName: "",
      jobTitle: "",
      categoryId: "",
      location: "",
      workMode: "not_specified",
      employmentType: "full_time",
      jobUrl: "",
      jobDescription: "",
      applicationDate: todayDateOnly(),
      closingDate: "",
      source: "linkedin",
      stage: "applied",
      followUpDate: "",
      notes: "",
    };
  }
  return {
    companyName: app.companyName,
    jobTitle: app.jobTitle,
    categoryId: app.categoryId,
    location: app.location,
    workMode: app.workMode,
    employmentType: app.employmentType,
    jobUrl: app.jobUrl,
    jobDescription: app.jobDescription,
    applicationDate: app.applicationDate ?? "",
    closingDate: app.closingDate ?? "",
    source: app.source,
    stage: app.stage,
    followUpDate: app.followUpDate ?? "",
    notes: app.notes,
  };
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function NewCategoryInline({ onCreated }: { onCreated: (category: Category) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();

  async function submit() {
    try {
      const category = await unwrap(addCategoryAction(name));
      onCreated(category);
      setName("");
      setError(undefined);
      setOpen(false);
      toast.success(`Category "${category.name}" added`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add category.");
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="link" size="xs" className="h-auto px-0" onClick={() => setOpen(true)}>
        <PlusIcon aria-hidden />
        New category
      </Button>
    );
  }
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-2">
        <Input
          autoFocus
          aria-label="New category name"
          placeholder="e.g. Data Engineer"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
            if (e.key === "Escape") setOpen(false);
          }}
        />
        <Button type="button" variant="outline" onClick={() => void submit()}>
          Add
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ApplicationForm({ application, categories }: { application?: Application; categories: Category[] }) {
  const router = useRouter();
  const isEdit = Boolean(application);
  const [values, setValues] = useState<ApplicationFormValues>(() => toFormValues(application));
  const [errors, setErrors] = useState<FormErrors>({});
  const [stageNote, setStageNote] = useState("");
  const [saving, setSaving] = useState(false);
  // Categories created inline are shown immediately, before the page data refreshes.
  const [extraCategories, setExtraCategories] = useState<Category[]>([]);

  const allCategories = [...categories, ...extraCategories.filter((e) => !categories.some((c) => c.id === e.id))];
  const stageChanged = isEdit && application!.stage !== values.stage;

  function set<K extends keyof ApplicationFormValues>(key: K, value: ApplicationFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { errors: found, input } = validateApplication(values, new Set(allCategories.map((c) => c.id)));
    setErrors(found);
    if (!input) {
      toast.error("Please fix the highlighted fields.");
      const first = Object.keys(found)[0];
      document.getElementById(`field-${first}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      // The server validates again; its field errors are shown the same way.
      const result = isEdit
        ? await updateApplicationAction(application!.id, values, stageNote)
        : await createApplicationAction(values);
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        setSaving(false);
        return;
      }
      toast.success(isEdit ? "Application updated" : "Application added");
      router.push(`/applications/${isEdit ? application!.id : result.data}`);
    } catch {
      toast.error("Could not reach the server. Is the app still running?");
      setSaving(false);
    }
  }

  const text = (key: keyof ApplicationFormValues, hint?: string) => ({
    ...fieldA11y(`field-${key}`, errors[key], Boolean(hint)),
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key, e.target.value as ApplicationFormValues[typeof key]),
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <Section title="Company & role" description="Keep the job title exactly as it appears in the advertisement.">
        <FormField id="field-companyName" label="Company name" required error={errors.companyName}>
          <Input {...text("companyName")} maxLength={LIMITS.companyName} autoComplete="off" />
        </FormField>
        <FormField id="field-jobTitle" label="Job title" required error={errors.jobTitle}>
          <Input {...text("jobTitle")} maxLength={LIMITS.jobTitle} autoComplete="off" />
        </FormField>
        <FormField id="field-categoryId" label="Role category" required error={errors.categoryId}>
          <SelectInput
            id="field-categoryId"
            value={values.categoryId}
            onChange={(v) => set("categoryId", v)}
            options={allCategories.map((c) => ({ value: c.id, label: c.name }))}
            error={errors.categoryId}
            placeholder="Choose a category"
          />
          <NewCategoryInline
            onCreated={(c) => {
              setExtraCategories((list) => [...list, c]);
              set("categoryId", c.id);
            }}
          />
        </FormField>
        <FormField id="field-location" label="Location" error={errors.location}>
          <Input {...text("location")} placeholder="e.g. Auckland" maxLength={LIMITS.location} />
        </FormField>
        <FormField id="field-workMode" label="Work mode" error={errors.workMode}>
          <SelectInput
            id="field-workMode"
            value={values.workMode}
            onChange={(v) => set("workMode", v)}
            options={optionsFrom(WORK_MODES, WORK_MODE_LABELS)}
          />
        </FormField>
        <FormField id="field-employmentType" label="Employment type" error={errors.employmentType}>
          <SelectInput
            id="field-employmentType"
            value={values.employmentType}
            onChange={(v) => set("employmentType", v)}
            options={optionsFrom(EMPLOYMENT_TYPES, EMPLOYMENT_TYPE_LABELS)}
          />
        </FormField>
        <FormField id="field-jobUrl" label="Job advertisement URL" error={errors.jobUrl} className="sm:col-span-2">
          <Input {...text("jobUrl")} type="url" inputMode="url" placeholder="https://" />
        </FormField>
      </Section>

      <Section title="Application" description="Dates, source and where this application currently stands.">
        <FormField id="field-applicationDate" label="Application date" required error={errors.applicationDate}>
          <Input {...text("applicationDate")} type="date" max={todayDateOnly()} />
        </FormField>
        <FormField id="field-closingDate" label="Closing date / deadline" error={errors.closingDate}>
          <Input {...text("closingDate")} type="date" />
        </FormField>
        <FormField id="field-source" label="Application source" error={errors.source}>
          <SelectInput
            id="field-source"
            value={values.source}
            onChange={(v) => set("source", v)}
            options={optionsFrom(SOURCES, SOURCE_LABELS)}
          />
        </FormField>
        <FormField
          id="field-stage"
          label="Current stage"
          error={errors.stage}
          hint={isEdit ? "Changing the stage adds an entry to the status history." : undefined}
        >
          <Select value={values.stage} onValueChange={(v) => set("stage", v as ApplicationFormValues["stage"])}>
            <SelectTrigger {...fieldA11y("field-stage", errors.stage, isEdit)} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectGroup>
                <SelectLabel>Active stages</SelectLabel>
                {ACTIVE_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Outcomes</SelectLabel>
                {TERMINAL_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormField>
        {stageChanged && (
          <FormField
            id="field-stageNote"
            label="Note for this stage change"
            hint={`${STAGE_LABELS[application!.stage]} → ${STAGE_LABELS[values.stage]}. Optional.`}
            className="sm:col-span-2"
          >
            <Input
              {...fieldA11y("field-stageNote", undefined, true)}
              value={stageNote}
              onChange={(e) => setStageNote(e.target.value)}
              maxLength={500}
            />
          </FormField>
        )}
        <FormField id="field-followUpDate" label="Next follow-up date" error={errors.followUpDate}>
          <Input {...text("followUpDate")} type="date" />
        </FormField>
      </Section>

      <Section title="Job description & notes" description="Paste the full advert so you still have it after the listing is taken down.">
        <FormField id="field-jobDescription" label="Full job description" error={errors.jobDescription} className="sm:col-span-2">
          <Textarea {...text("jobDescription")} rows={10} className="max-h-[480px] font-normal" />
        </FormField>
        <FormField id="field-notes" label="Personal notes" error={errors.notes} className="sm:col-span-2">
          <Textarea
            {...text("notes")}
            rows={5}
            placeholder="Contacts, salary expectations, why you applied, prep notes…"
            className="max-h-[360px]"
          />
        </FormField>
      </Section>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <Button type="button" variant="outline" size="lg" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={saving}>
          {saving && <Loader2Icon className="animate-spin" aria-hidden />}
          {isEdit ? "Save changes" : "Add application"}
        </Button>
      </div>
    </form>
  );
}
