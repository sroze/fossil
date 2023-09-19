import React, { useState } from 'react';

export const EditableTextAsInput: React.FC<{
  name: string;
  initialValue: string;
}> = ({ name, initialValue }) => {
  const [editing, setEditing] = useState<boolean>(false);
  const [value, setValue] = useState<string>(initialValue);

  return (
    <div>
      {editing ? (
        <input
          type="text"
          className="w-full"
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setEditing(false);
            }
          }}
        />
      ) : (
        <>
          <input type="hidden" name={name} value={value} />
          <span onClick={() => setEditing(true)}>{initialValue}</span>
        </>
      )}
    </div>
  );
};
