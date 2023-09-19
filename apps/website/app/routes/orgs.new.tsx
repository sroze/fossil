import { Navbar } from '~/modules/layout/organisms/Navbar';
import { ValidatedForm, validationError } from 'remix-validated-form';
import { FormInput } from '~/modules/zod-forms/components/input';
import { SubmitButton } from '~/modules/zod-forms/components/submit-button';
import { ActionFunction, LoaderFunction, redirect } from '@remix-run/node';
import {
  actionWithAuthorization,
  loaderWithAuthorization,
} from '~/modules/identity-and-authorization/remix-utils.server';
import { withZod } from '@remix-validated-form/with-zod';
import { z } from 'zod';
import { v4 } from 'uuid';
import { organisation } from '~/modules/organisations/service';
import { serializeCheckpoint } from '~/utils/eventual-consistency';

export const generateOrganisationValidator = withZod(
  z.object({
    name: z
      .string()
      .min(3, { message: 'Organisation name must be at least 3 letters' }),
  })
);

export const action: ActionFunction = (args) =>
  actionWithAuthorization(args, async ({ request, profile }) => {
    const { data, error } = await generateOrganisationValidator.validate(
      await request.formData()
    );

    if (error) {
      return validationError(error);
    }

    const identifier = v4();
    const { global_position } = await organisation(identifier).write({
      type: 'CreateOrganisationCommand',
      data: {
        name: data.name,
        created_by: profile.id,
      },
    });

    return redirect(
      `/orgs/${identifier}?c=${serializeCheckpoint({ global_position })}`
    );
  });

export const loader: LoaderFunction = (args) => loaderWithAuthorization(args);

export default function CreateOrganisation() {
  return (
    <div className="relative flex min-h-full flex-col">
      <Navbar />

      <div className="flex flex-1">
        <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            <div>
              <span className="text-3xl">🪨</span>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
                Create an organisation
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Or{' '}
                <a
                  href="/"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  go back to the list
                </a>
                .
              </p>
            </div>

            <div className="mt-8">
              <div className="mt-6">
                <ValidatedForm
                  validator={generateOrganisationValidator}
                  method="post"
                >
                  <FormInput className="mb-5" name="name" label="Name" />

                  <SubmitButton>Create</SubmitButton>
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
