import { LoaderFunction } from "@remix-run/node";
import {authenticator} from "../../modules/identity-and-authorization/authenticator.server";

export let loader: LoaderFunction = ({ request }) => {
  return authenticator.authenticate("default", request);
};
