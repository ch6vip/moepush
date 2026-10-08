"use client"

import { useEffect, useId, useState } from "react"
import type { UseFormReturn } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { MessageTemplate, TemplateField } from "@/lib/channels/base"
import { getNestedValue, setNestedValue } from "@/lib/utils"
import { FunctionSelector } from "@/components/function-selector"

interface TemplateFieldsProps {
  form: UseFormReturn<any>
  template: MessageTemplate
}

type FieldControlProps = {
  field: TemplateField
  id: string
  value: any
  invalid: boolean
  describedBy?: string
  onChange: (value: any) => void
}

function FieldComponent({ field, id, value, invalid, describedBy, onChange }: FieldControlProps) {
  const accessibility = { id, "aria-invalid": invalid, "aria-describedby": describedBy }
  switch (field.component) {
    case "textarea":
      return <Textarea {...accessibility} value={value ?? ""} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder || `请输入${field.description}`} className="resize-none" />
    case "checkbox":
      return <Checkbox {...accessibility} checked={value ?? false} onCheckedChange={onChange} />
    case "select":
      return (
        <Select value={value || field.options?.[0]?.value || ""} onValueChange={onChange}>
          <SelectTrigger {...accessibility}>
            <SelectValue placeholder={field.placeholder || `请选择${field.description}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )
    case "hidden":
      return null
    default:
      return <Input {...accessibility} value={value ?? ""} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder || `请输入${field.description}`} />
  }
}

function isVariableSupported(field: TemplateField) {
  return field.component === "textarea" || !field.component
}

function serializeValues(template: MessageTemplate, values: Record<string, any>) {
  const nested: Record<string, any> = {}
  for (const field of template.fields) {
    if (Object.prototype.hasOwnProperty.call(values, field.key)) setNestedValue(nested, field.key, values[field.key])
    else if (field.component === "hidden" && field.defaultValue !== undefined) setNestedValue(nested, field.key, field.defaultValue)
  }
  return nested
}

export function findMissingRequiredTemplateFields(template: MessageTemplate, ruleValue: unknown): TemplateField[] {
  let rule: unknown = ruleValue
  if (typeof ruleValue === "string") {
    try { rule = JSON.parse(ruleValue || "{}") } catch { rule = {} }
  }
  return template.fields.filter((field) => {
    if (!field.required) return false
    const value = getNestedValue(rule, field.key)
    return value === undefined || value === null || (typeof value === "string" && value.trim() === "") || (Array.isArray(value) && value.length === 0)
  })
}

function fieldLabel(field: TemplateField) {
  return (field.description || field.key).replace(/<[^>]*>/g, "").trim()
}

export function TemplateFields({ form, template }: TemplateFieldsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [prevType, setPrevType] = useState(template.type)
  const idPrefix = useId()
  const [fieldValues, setFieldValues] = useState<Record<string, any>>(() => {
    try {
      const rule = JSON.parse(form.getValues("rule") || "{}")
      const values: Record<string, any> = {}
      template.fields.forEach((field) => {
        const value = getNestedValue(rule, field.key)
        if (value !== undefined) values[field.key] = value
        else if (field.component === "hidden" && field.defaultValue !== undefined) values[field.key] = field.defaultValue
      })
      return values
    } catch {
      return Object.fromEntries(template.fields.filter((field) => field.component === "hidden" && field.defaultValue !== undefined).map((field) => [field.key, field.defaultValue]))
    }
  })

  const requiredFields = template.fields.filter((field) => field.required)
  const optionalFields = template.fields.filter((field) => !field.required && field.component !== "hidden")
  const submittedTemplateError = form.formState.errors.rule?.type === "template-required"
  const missingFields = submittedTemplateError ? findMissingRequiredTemplateFields(template, fieldValues) : []
  const missingKeys = new Set(missingFields.map((field) => field.key))

  useEffect(() => {
    if (prevType !== template.type) {
      const retained: Record<string, any> = {}
      template.fields.forEach((field) => {
        if (fieldValues[field.key] !== undefined) retained[field.key] = fieldValues[field.key]
        else if (field.component === "hidden" && field.defaultValue !== undefined) retained[field.key] = field.defaultValue
      })
      setFieldValues(retained)
      setPrevType(template.type)
    }
  }, [template.type, prevType, fieldValues, template.fields])

  useEffect(() => {
    form.setValue("rule", JSON.stringify(serializeValues(template, fieldValues), null, 2), { shouldValidate: false })
    if (form.formState.errors.rule?.type === "template-required") {
      const missing = findMissingRequiredTemplateFields(template, fieldValues)
      if (missing.length === 0) form.clearErrors("rule")
      else form.setError("rule", { type: "template-required", message: `请填写必填项：${missing.map(fieldLabel).join("、")}` })
    }
  }, [fieldValues, form, template])

  const updateField = (key: string, value: unknown) => {
    setFieldValues((current) => ({ ...current, [key]: value }))
  }

  const renderField = (field: TemplateField, required: boolean) => {
    const id = `${idPrefix}-${field.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`
    const errorId = `${id}-error`
    const missing = required && missingKeys.has(field.key)
    return (
      <div key={field.key} className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={id} className="text-sm font-medium">
            {fieldLabel(field)}{required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
          </label>
          {isVariableSupported(field) && <FunctionSelector onSelect={(value) => updateField(field.key, (fieldValues[field.key] || "") + value)} />}
        </div>
        {field.component !== "hidden" && (
          <FieldComponent
            field={field}
            id={id}
            value={fieldValues[field.key]}
            invalid={missing}
            describedBy={missing ? errorId : undefined}
            onChange={(value) => updateField(field.key, value)}
          />
        )}
        {missing && <p id={errorId} className="text-sm text-destructive" role="alert">此项为必填项</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div className="mb-2 text-sm font-medium text-muted-foreground">请填写以下字段：</div>
      <div className="space-y-4">{requiredFields.map((field) => renderField(field, true))}</div>
      {optionalFields.length > 0 && (
        <div className="border-t pt-2">
          <Button type="button" variant="ghost" className="h-9 w-full justify-between px-2 hover:bg-muted" onClick={() => setShowAdvanced(!showAdvanced)} aria-expanded={showAdvanced}>
            <span className="text-sm font-medium text-muted-foreground">高级设置</span>
            {showAdvanced ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
          </Button>
          {showAdvanced && <div className="mt-4 space-y-4">{optionalFields.map((field) => renderField(field, false))}</div>}
        </div>
      )}
    </div>
  )
}
