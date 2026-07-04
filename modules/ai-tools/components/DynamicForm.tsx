'use client';

import type { InputField } from '@/modules/ai-tools/types';

type DynamicFormProps = {
  fields: InputField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  disabled?: boolean;
};

export function DynamicForm({ fields, values, onChange, disabled }: DynamicFormProps) {
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="ui-label">
            {field.label}
            {field.required !== false && <span className="text-danger"> *</span>}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              id={field.name}
              rows={field.rows ?? 4}
              placeholder={field.placeholder}
              value={values[field.name] ?? ''}
              onChange={(e) => onChange(field.name, e.target.value)}
              disabled={disabled}
              className="ui-input mt-1.5"
            />
          ) : field.type === 'select' ? (
            <select
              id={field.name}
              value={values[field.name] ?? field.defaultValue ?? ''}
              onChange={(e) => onChange(field.name, e.target.value)}
              disabled={disabled}
              className="ui-input mt-1.5"
            >
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={field.name}
              type={field.type === 'number' ? 'number' : 'text'}
              placeholder={field.placeholder}
              value={values[field.name] ?? field.defaultValue ?? ''}
              onChange={(e) => onChange(field.name, e.target.value)}
              disabled={disabled}
              className="ui-input mt-1.5"
            />
          )}
        </div>
      ))}
    </div>
  );
}
