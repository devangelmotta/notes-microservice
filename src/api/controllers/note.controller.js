const httpStatus = require("http-status");
const { omit } = require("lodash");
const Note = require("../models/notes.model");

/**
 * Load note and append to req.
 * @public
 */
exports.load = async (req, res, next, id) => {
  try {
    const note = await Note.get(id);
    req.locals = { note };
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Get note
 * @public
 */
exports.get = (req, res) => res.json(req.locals.note.transform());

/**
 * Create new note
 * @public
 */
exports.create = async (req, res, next) => {
  try {
    console.log("Create");
    const note = new Note(req.body);
    const savedNote = await note.save();
    res.status(httpStatus.CREATED);
    res.json(savedNote.transform());
  } catch (error) {
    console.log("Error ", error);
    next(Note.checkDuplicateText(error));
  }
};

/**
 * Replace existing note
 * @public
 */
exports.replace = async (req, res, next) => {
  try {
    const { note } = req.locals;
    const newNote = new Note(req.body);
    const ommitRole = note.role !== "admin" ? "role" : "";
    const newNoteObject = omit(newNote.toObject(), "_id", ommitRole);

    await note.update(newNoteObject, { override: true, upsert: true });
    const savedNote = await Note.findById(note._id);

    res.json(savedNote.transform());
  } catch (error) {
    next(Note.checkDuplicateEmail(error));
  }
};

/**
 * Update existing note
 * @public
 */
exports.update = async (req, res, next) => {
  const updatedNote = omit(req.body);
  const note = Object.assign(req.locals.note, updatedNote);

  note
    .save()
    .then((savedNote) => res.json(savedNote.transform()))
    .catch((e) => next(Note.checkDuplicateText(e)));
};

/**
 * Get note list
 * @public
 */
exports.list = async (req, res, next) => {
  try {
    console.log("List");
    const notes = await Note.list(req.body);
    const transformedNotes = notes.map((note) => note.transform());
    res.json(transformedNotes);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete note
 * @public
 */
exports.remove = (req, res, next) => {
  const { note } = req.locals;

  note
    .remove()
    .then(() => res.status(httpStatus.NO_CONTENT).end())
    .catch((e) => next(e));
};
