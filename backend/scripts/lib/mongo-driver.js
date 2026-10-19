// The Mongo -> Neon scripts in this folder are historical, one-off migrations.
// The application itself no longer depends on Mongoose, so the driver is loaded
// lazily: importing these scripts (for their pure normalizers, e.g. in tests)
// must not require Mongoose to be installed.
export async function loadMongoose() {
  try {
    const { default: mongoose } = await import("mongoose");
    return mongoose;
  } catch {
    throw new Error(
      "This legacy import script needs the Mongoose driver. " +
        "Install it on demand with `npm i -D mongoose`, then re-run the script.",
    );
  }
}
