import { DataFunctionArgs, json, LoaderFunction } from '@remix-run/node';
import { useActionData } from '@remix-run/react';
import { withZod } from '@remix-validated-form/with-zod';
import { ValidatedForm, validationError } from 'remix-validated-form';
import { z } from 'zod';
import { SubmitButton } from '../modules/zod-forms/submit-button';
import { FormInput } from '../modules/zod-forms/input';
import { Navbar } from '../modules/layout/organisms/Navbar';
import { loaderWithAuthorization } from '../modules/identity-and-authorization/remix-utils.server';

export const loader: LoaderFunction = (args) =>
  loaderWithAuthorization(args, async () => {
    return {};
  });

export const validator = withZod(
  z.object({
    name: z.string().min(1, { message: 'The name of the store' }),
    region: z.enum(['london']),
  })
);

export const action = async ({ request }: DataFunctionArgs) => {
  const { data, error } = await validator.validate(await request.formData());

  if (error) {
    return validationError(error);
  }

  //
  // TODO: Write in `stream` for this account?

  return json(data);
};

export default function Demo() {
  const data = useActionData();

  return (
    <div className="relative flex min-h-full flex-col">
      {/* Navbar */}
      <Navbar />

      <div className="flex flex-1">
        <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            <div>
              <img
                className="h-12 w-auto"
                src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
                alt="Your Company"
              />
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
                Create an event store
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Or{' '}
                <a
                  href="#"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  do something else
                </a>
              </p>
            </div>

            <div className="mt-8">
              <div className="mt-6">
                <ValidatedForm validator={validator} method="post">
                  <FormInput className="mb-5" name="name" label="Name" />
                  <input type="hidden" name="region" value="london" />

                  <SubmitButton>Create</SubmitButton>

                  {data ? <pre>{JSON.stringify(data)}</pre> : null}
                </ValidatedForm>
              </div>
            </div>
          </div>
        </div>
        <div className="relative hidden w-0 flex-1 lg:block">
          <img
            className="absolute inset-0 h-full w-full object-cover"
            src="https://images.unsplash.com/photo-1505904267569-f02eaeb45a4c?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1908&q=80"
            alt=""
          />
        </div>
      </div>
    </div>
  );
}
