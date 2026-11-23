"use server";

import type { FormState } from "@/lib/form";
import { deleteContent, saveContent } from "./content-helpers";

/* Thin Server Action entry points; admin checks happen inside saveContent/deleteContent. */

export async function saveFacility(_prev: FormState, form: FormData) {
  return saveContent("facilities", form);
}
export async function deleteFacility(_prev: FormState, form: FormData) {
  return deleteContent("facilities", form);
}
export async function saveActivity(_prev: FormState, form: FormData) {
  return saveContent("activities", form);
}
export async function deleteActivity(_prev: FormState, form: FormData) {
  return deleteContent("activities", form);
}
export async function savePlace(_prev: FormState, form: FormData) {
  return saveContent("places", form);
}
export async function deletePlace(_prev: FormState, form: FormData) {
  return deleteContent("places", form);
}
export async function saveGalleryImage(_prev: FormState, form: FormData) {
  return saveContent("gallery", form);
}
export async function deleteGalleryImage(_prev: FormState, form: FormData) {
  return deleteContent("gallery", form);
}
export async function saveTestimonial(_prev: FormState, form: FormData) {
  return saveContent("testimonials", form);
}
export async function deleteTestimonial(_prev: FormState, form: FormData) {
  return deleteContent("testimonials", form);
}
