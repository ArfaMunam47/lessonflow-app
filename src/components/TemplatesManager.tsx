/**
 * Block Templates Manager Component
 * 
 * Allows teachers to configure reusable block field architectures:
 * - Field keys, labels, types (textarea, text), order, required flag, placeholder
 * - Manage default template
 * - Adaptable for any future school website field structure
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { BlockTemplate, BlockFieldTemplate, FieldType } from '../types/index.js';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Check,
  Star,
  Copy,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

export const TemplatesManager: React.FC = () => {
  const {
    templates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    showToast,
  } = useApp();

  const [editingTemplate, setEditingTemplate] = useState<BlockTemplate | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form State for creating/editing
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [fields, setFields] = useState<BlockFieldTemplate[]>([
    { key: 'objective', label: 'Objective', type: 'textarea', order: 1, isRequired: true, placeholder: 'Objective...' },
    { key: 'teacher_activity', label: 'Teacher Activity', type: 'textarea', order: 2, isRequired: true, placeholder: 'Teacher activity...' },
    { key: 'student_activity', label: 'Student Activity', type: 'textarea', order: 3, isRequired: true, placeholder: 'Student activity...' },
  ]);

  const handleStartCreate = () => {
    setName('Custom Lesson Block');
    setDescription('Configured block structure matching school website requirements');
    setIsDefault(false);
    setFields([
      { key: 'objective', label: 'Objective', type: 'textarea', order: 1, isRequired: true, placeholder: 'Enter objective...' },
      { key: 'teacher_activity', label: 'Teacher Activity', type: 'textarea', order: 2, isRequired: true, placeholder: 'Teacher activity...' },
      { key: 'student_activity', label: 'Student Activity', type: 'textarea', order: 3, isRequired: true, placeholder: 'Student activity...' },
      { key: 'resources', label: 'Resources / Materials', type: 'text', order: 4, isRequired: false, placeholder: 'Resources...' },
      { key: 'assessment', label: 'Assessment', type: 'textarea', order: 5, isRequired: false, placeholder: 'Assessment...' },
    ]);
    setIsCreatingNew(true);
    setEditingTemplate(null);
  };

  const handleStartEdit = (template: BlockTemplate) => {
    setName(template.name);
    setDescription(template.description);
    setIsDefault(Boolean(template.isDefault));
    setFields([...template.fields]);
    setEditingTemplate(template);
    setIsCreatingNew(false);
  };

  const handleAddField = () => {
    const order = fields.length + 1;
    setFields([
      ...fields,
      {
        key: `field_${order}`,
        label: `Field ${order}`,
        type: 'textarea',
        order,
        isRequired: false,
        placeholder: '',
      },
    ]);
  };

  const handleRemoveField = (index: number) => {
    if (fields.length <= 1) {
      showToast('A template must have at least one field', 'error');
      return;
    }
    const updated = fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i + 1 }));
    setFields(updated);
  };

  const handleFieldChange = (index: number, keyProp: keyof BlockFieldTemplate, val: any) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [keyProp]: val };
    // Automatically keep key in sync with label if key was default
    if (keyProp === 'label') {
      const suggestedKey = val.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (suggestedKey) {
        updated[index].key = suggestedKey;
      }
    }
    setFields(updated);
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...fields];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    updated.forEach((f, i) => (f.order = i + 1));
    setFields(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Template name is required', 'error');
      return;
    }
    if (fields.length === 0) {
      showToast('Add at least one field', 'error');
      return;
    }

    if (isCreatingNew) {
      await createTemplate({
        name,
        description,
        isDefault,
        fields,
      });
      setIsCreatingNew(false);
    } else if (editingTemplate) {
      await updateTemplate(editingTemplate.id, {
        name,
        description,
        isDefault,
        fields,
      });
      setEditingTemplate(null);
    }
  };

  const handleCancel = () => {
    setIsCreatingNew(false);
    setEditingTemplate(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2">
      {/* Top Banner */}
      <div className="bg-white border-2 border-[#18181B] rounded-[22px] p-6 shadow-[2px_2px_0px_#18181B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#18181B] stroke-[2.5]" />
            <h2 className="text-xl font-black text-[#18181B] tracking-tight">
              Block Templates & Field Configuration
            </h2>
          </div>
          <p className="text-xs text-[#52525B] font-bold mt-1 max-w-2xl leading-relaxed">
            Configure reusable block structures to match any school website requirements.
            When you create blocks, LessonFlow automatically builds all configured fields.
          </p>
        </div>

        <button
          onClick={handleStartCreate}
          className="inline-flex items-center px-4 py-2.5 bg-[#18181B] hover:bg-neutral-800 text-white font-black text-xs rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5 stroke-[3]" />
          Create New Template
        </button>
      </div>

      {/* Template Editor Drawer / Form (when creating or editing) */}
      {(isCreatingNew || editingTemplate) && (
        <div className="bg-[#FAF7EE] border-2 border-[#18181B] rounded-[22px] p-6 shadow-[3px_3px_0px_#18181B] space-y-4">
          <div className="flex justify-between items-center border-b-2 border-[#18181B]/15 pb-3">
            <h3 className="text-base font-black text-[#18181B]">
              {isCreatingNew ? 'Create New Block Template' : `Edit Template: ${editingTemplate?.name}`}
            </h3>
            <span className="text-xs text-[#18181B] font-black bg-[#E9D5FF] px-2.5 py-1 rounded-lg border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B]">
              Configuring Block Fields
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-[#18181B] uppercase tracking-wider mb-1">
                  Template Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Standard 5-Field Lesson Block"
                  className="w-full text-xs border-2 border-[#18181B] rounded-xl p-2.5 font-bold text-[#18181B] bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#18181B] uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Used for daily core instruction"
                  className="w-full text-xs border-2 border-[#18181B] rounded-xl p-2.5 font-bold text-[#18181B] bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center space-x-2 text-xs font-black text-[#18181B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={e => setIsDefault(e.target.checked)}
                  className="w-4 h-4 accent-[#18181B] rounded"
                />
                <span>Set as Default Template for new blocks</span>
              </label>
            </div>

            {/* Configured Fields List */}
            <div className="border-2 border-[#18181B] rounded-xl p-4 bg-white space-y-3 shadow-[1px_1px_0px_#18181B]">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-[#18181B] uppercase tracking-wider">
                  Block Fields ({fields.length})
                </h4>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="inline-flex items-center text-xs font-black text-[#18181B] bg-[#FAF7EE] hover:bg-[#FEF08A] border-2 border-[#18181B] px-3 py-1.5 rounded-lg shadow-[1px_1px_0px_#18181B] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" />
                  Add Field
                </button>
              </div>

              <div className="space-y-2">
                {fields.map((field, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-[#FAF7EE] border-2 border-[#18181B] rounded-xl p-2.5 shadow-[1px_1px_0px_#18181B]"
                  >
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveField(idx, 'up')}
                        disabled={idx === 0}
                        className="text-[#18181B] hover:text-black disabled:opacity-20 p-1 cursor-pointer"
                        title="Move field up"
                      >
                        <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveField(idx, 'down')}
                        disabled={idx === fields.length - 1}
                        className="text-[#18181B] hover:text-black disabled:opacity-20 p-1 cursor-pointer"
                        title="Move field down"
                      >
                        <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      <span className="text-xs font-black text-[#18181B] font-mono w-4 text-center">
                        {idx + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-[130px]">
                      <input
                        type="text"
                        value={field.label}
                        onChange={e => handleFieldChange(idx, 'label', e.target.value)}
                        placeholder="Field Label (e.g. Objective)"
                        className="w-full text-xs font-bold border-2 border-[#18181B] rounded-lg px-2.5 py-1 text-[#18181B] bg-white focus:outline-hidden"
                      />
                    </div>

                    <div className="w-28 shrink-0">
                      <input
                        type="text"
                        value={field.key}
                        onChange={e => handleFieldChange(idx, 'key', e.target.value)}
                        placeholder="key (e.g. objective)"
                        className="w-full text-[11px] font-mono font-bold border-2 border-[#18181B] rounded-lg px-2 py-1 text-[#52525B] bg-white focus:outline-hidden"
                      />
                    </div>

                    <div className="w-28 shrink-0">
                      <select
                        value={field.type}
                        onChange={e => handleFieldChange(idx, 'type', e.target.value as FieldType)}
                        className="w-full text-xs font-bold border-2 border-[#18181B] rounded-lg px-2 py-1 text-[#18181B] bg-white focus:outline-hidden cursor-pointer"
                      >
                        <option value="textarea">Textarea</option>
                        <option value="text">Single Text</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <label className="flex items-center space-x-1 text-xs font-black text-[#18181B] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.isRequired}
                          onChange={e => handleFieldChange(idx, 'isRequired', e.target.checked)}
                          className="w-3.5 h-3.5 accent-[#18181B] rounded"
                        />
                        <span>Req</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveField(idx)}
                      className="p-1 text-[#52525B] hover:text-rose-600 rounded hover:bg-rose-50 shrink-0 cursor-pointer"
                      title="Remove field"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-xs font-black text-[#18181B] bg-white hover:bg-[#FAF7EE] rounded-xl border-2 border-[#18181B] shadow-[1px_1px_0px_#18181B] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-black text-white bg-[#18181B] hover:bg-neutral-800 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] cursor-pointer"
              >
                Save Template
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Available Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates.map(tmpl => (
          <div
            key={tmpl.id}
            className="bg-white border-2 border-[#18181B] rounded-[22px] p-5 shadow-[2px_2px_0px_#18181B] hover:shadow-[3px_3px_0px_#18181B] transition-all space-y-3.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-black text-[#18181B]">
                      {tmpl.name}
                    </h3>
                    {tmpl.isDefault && (
                      <span className="text-[10px] font-black text-[#18181B] bg-[#FEF08A] px-2 py-0.5 rounded-md border-2 border-[#18181B] flex items-center shadow-[1px_1px_0px_#18181B]">
                        <Star className="w-3 h-3 mr-0.5 fill-[#18181B] text-[#18181B]" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#52525B] font-bold mt-1 line-clamp-2">
                    {tmpl.description || 'Configurable lesson block template'}
                  </p>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(tmpl)}
                    title="Edit template"
                    className="p-1.5 text-[#18181B] hover:bg-[#FAF7EE] rounded-lg border-2 border-transparent hover:border-[#18181B] cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete template "${tmpl.name}"?`)) {
                        deleteTemplate(tmpl.id);
                      }
                    }}
                    title="Delete template"
                    className="p-1.5 text-[#52525B] hover:text-rose-600 rounded-lg hover:bg-rose-50 border-2 border-transparent hover:border-[#18181B] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Field badges preview */}
              <div className="space-y-2 pt-3 border-t-2 border-[#18181B]/15">
                <span className="text-[10px] font-black text-[#52525B] uppercase tracking-wider block">
                  Fields ({tmpl.fields.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tmpl.fields.map(f => (
                    <span
                      key={f.key}
                      className="text-xs bg-[#FAF7EE] text-[#18181B] px-2.5 py-1 rounded-lg border-2 border-[#18181B] font-black shadow-[1px_1px_0px_#18181B]"
                    >
                      {f.label}
                      {f.isRequired && <span className="text-rose-500 ml-0.5">*</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center text-xs border-t-2 border-[#18181B]/15">
              {!tmpl.isDefault ? (
                <button
                  type="button"
                  onClick={() => updateTemplate(tmpl.id, { isDefault: true })}
                  className="text-xs font-black text-[#18181B] hover:underline cursor-pointer"
                >
                  Make Default
                </button>
              ) : (
                <span className="text-[11px] font-bold text-[#52525B]">Default for new blocks</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
