import { redirect } from "next/navigation";

/**
 * /favourites — canonical redirect to /my-bar/favourites.
 * Keeps the URL from the acceptance criteria working while
 * housing the real page inside the My Bar section.
 */
export default function FavouritesRedirect() {
  redirect("/my-bar/favourites");
}
