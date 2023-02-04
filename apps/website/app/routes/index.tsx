import {loaderWithAuthorization} from "../modules/identity-and-authorization/remix-utils.server";
import {LoaderFunction} from "@remix-run/node";
import {Navbar} from "../modules/layout/organisms/Navbar";

type LoaderData = {};

export const loader: LoaderFunction = args => loaderWithAuthorization<LoaderData>(args, async () => {
  return {};
});

export default function Index() {
  return (
    <>
      <div className="relative flex min-h-screen flex-col">
        {/* Navbar */}
        <Navbar />


      </div>
    </>
  )
}
