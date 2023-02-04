import {MagnifyingGlassIcon} from "@heroicons/react/20/solid";

export const SearchBar = () => (
  <div className="flex flex-1 justify-center lg:justify-end">
    <div className="w-full px-2 lg:px-6">
      <label htmlFor="search" className="sr-only">
        Search projects
      </label>
      <div className="relative text-indigo-200 focus-within:text-gray-400">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
        </div>
        <input
          id="search"
          name="search"
          className="block w-full rounded-md border border-transparent bg-indigo-400 bg-opacity-25 py-2 pl-10 pr-3 leading-5 text-indigo-100 placeholder-indigo-200 focus:bg-white focus:text-gray-900 focus:placeholder-gray-400 focus:outline-none focus:ring-0 sm:text-sm"
          placeholder="Search projects"
          type="search"
        />
      </div>
    </div>
  </div>
);
