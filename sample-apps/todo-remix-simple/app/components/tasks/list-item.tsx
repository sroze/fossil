import React from 'react';
import { EditableTextAsInput } from '../editable-text-input';

export const ListItem: React.FC<{
  id: string;
  name: string;
  completed: boolean;
}> = ({ id, name, completed }) => {
  return (
    <form action={`/tasks/${id}`} method="post" className="flex gap-x-4">
      <div className="p-2 flex-none">
        <input
          type="checkbox"
          checked={completed}
          name="completed"
          onChange={(e) => {
            e.target.form?.submit();
          }}
        />
      </div>
      <div className="min-w-0 flex-auto py-2">
        <EditableTextAsInput name="name" initialValue={name} />
      </div>
    </form>
  );
};
