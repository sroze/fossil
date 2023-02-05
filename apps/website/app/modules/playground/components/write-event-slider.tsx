import React from 'react';
import { QuestionMarkCircleIcon } from '@heroicons/react/20/solid';
import { Slider, SliderProps } from '../../design-system/slider';
import { SliderTitle } from '../../design-system/slider.title';
import { useFetcher } from '@remix-run/react';
import { ValidatedForm } from 'remix-validated-form';
import { FormInput, TextAreaInput } from '../../zod-forms/components/input';
import {
  SuccessfulWriteResponse,
  writeEventValidator,
} from '../../../routes/api.stores.$id/write';
import { SubmitButton } from '../../zod-forms/components/submit-button';

export const WriteEventSlider: React.FC<
  SliderProps & {
    storeId: string;
  }
> = ({ storeId, open, onClose }) => {
  // FIXME: At the moment, we can't catch errors properly (see https://github.com/remix-run/remix/discussions/4242)
  const writer = useFetcher<SuccessfulWriteResponse>();

  return (
    <Slider open={open} onClose={onClose}>
      <ValidatedForm
        validator={writeEventValidator}
        method="post"
        action={`/api/stores/${storeId}/write`}
        fetcher={writer}
        className="flex h-full flex-col divide-y divide-gray-200 bg-white shadow-xl"
      >
        <div className="h-0 flex-1 overflow-y-auto">
          <SliderTitle
            title="Write event"
            subtitle="Because you want to"
            onClose={onClose}
          />
          <div className="flex flex-1 flex-col justify-between">
            <div className="divide-y divide-gray-200 px-4 sm:px-6">
              <div className="space-y-6 pt-6 pb-5">
                <FormInput
                  className="mb-5"
                  name="stream"
                  label="Stream"
                  required
                />
                <FormInput
                  className="mb-5"
                  name="type"
                  label="Event Type"
                  required
                />
                <TextAreaInput
                  className="mb-5"
                  name="data"
                  label="Payload"
                  required
                />
                <FormInput
                  className="mb-5"
                  name="expected_version"
                  label="Expected version"
                  type="number"
                />
              </div>
              <div className="pt-4 pb-6">
                <div className="mt-4 flex text-sm">
                  <a
                    href="#"
                    className="group inline-flex items-center text-gray-500 hover:text-gray-900"
                  >
                    <QuestionMarkCircleIcon
                      className="h-5 w-5 text-gray-400 group-hover:text-gray-500"
                      aria-hidden="true"
                    />
                    <span className="ml-2">
                      Learn more about writing events.
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-shrink-0 justify-end px-4 py-4">
          {writer.data ? (
            <div className="pt-2 text-green-700 flex-1 text-sm">
              ✔️ Wrote event at position {writer.data.position}
            </div>
          ) : null}
          <button
            type="button"
            className="rounded-md border mr-4 border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={() => onClose()}
          >
            Cancel
          </button>
          <SubmitButton>Write</SubmitButton>
        </div>
      </ValidatedForm>
    </Slider>
  );
};
