import {
  FetcherWithComponents,
  SubmitFunction,
  useFetcher,
} from '@remix-run/react';
import { useMutation } from 'react-query';
import type { ActionSubmission } from '@remix-run/react/dist/transition';

export function isHtmlElement(object: any): object is HTMLElement {
  return object != null && typeof object.tagName === 'string';
}

export function isButtonElement(object: any): object is HTMLButtonElement {
  return isHtmlElement(object) && object.tagName.toLowerCase() === 'button';
}

export function isFormElement(object: any): object is HTMLFormElement {
  return isHtmlElement(object) && object.tagName.toLowerCase() === 'form';
}

export function isInputElement(object: any): object is HTMLInputElement {
  return isHtmlElement(object) && object.tagName.toLowerCase() === 'input';
}

function formDataFromTarget(target: Parameters<SubmitFunction>[0]): FormData {
  if (isFormElement(target)) {
    return new FormData(target);
  } else if (
    isButtonElement(target) ||
    (isInputElement(target) &&
      (target.type === 'submit' || target.type === 'image'))
  ) {
    let form = target.form;
    if (form == null) {
      throw new Error(
        `Cannot submit a <button> or <input type="submit"> without a <form>`
      );
    }

    return new FormData(form);
  }

  throw new Error(`Unable to get form data from target.`);
}

export function mutationAsFetcher<TData = any>(
  mutationFn: (data: FormData) => Promise<TData>
): FetcherWithComponents<TData | Error> {
  const mutation = useMutation({
    mutationFn,
  });

  const { Form } = useFetcher();
  const load = () => {};
  const submit: SubmitFunction = (target, options = {}) => {
    mutation.mutate(formDataFromTarget(target));
  };

  if (mutation.isLoading) {
    return {
      Form,
      load,
      submit,
      state: 'submitting',
      type: 'actionSubmission',
      formMethod: 'POST',
      formAction: 'unknown',
      formData: new FormData(),
      formEncType: 'unknown',
      submission: undefined as unknown as ActionSubmission,
      data: undefined,
    };
  } else if (mutation.isError || mutation.isSuccess) {
    return {
      Form,
      load,
      submit,
      state: 'idle',
      type: 'done',
      submission: undefined,
      data: mutation.isError ? (mutation.error as Error) : mutation.data,
    };
  }

  return {
    Form,
    load,
    submit,
    state: 'idle',
    type: 'init',
    submission: undefined,
    data: undefined,
  };
}
