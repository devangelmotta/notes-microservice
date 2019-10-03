const Joi = require("joi");
const Note = require("../models/notes.model");

module.exports = {
  // GET /v1/notes
  listNotes: {
    query: {
      page: Joi.number().min(1),
      perPage: Joi.number()
        .min(1)
        .max(100),
      text: Joi.string()
    }
  },

  // POST /v1/notes
  createNote: {
    body: {
      text: Joi.string()
    }
  },

  // PUT /v1/notes/:noteId
  replaceNote: {
    body: {
      text: Joi.string()
    },
    params: {
      noteId: Joi.string()
        .regex(/^[a-fA-F0-9]{24}$/)
        .required()
    }
  },

  // PATCH /v1/notes/:noteId
  updateNote: {
    body: {
      text: Joi.string()
    },
    params: {
      noteId: Joi.string()
        .regex(/^[a-fA-F0-9]{24}$/)
        .required()
    }
  }
};
