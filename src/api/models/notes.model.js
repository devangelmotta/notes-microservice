const mongoose = require("mongoose");
const httpStatus = require("http-status");
const { omitBy, isNil } = require("lodash");
const APIError = require("../utils/APIError");

/**
 * Note Schema
 * @private
 */
const noteSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true
    },
    fingerprint: {
      type: Object,
      required: true
    },
    text: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

/**
 * Methods
 */
noteSchema.method({
  transform() {
    const transformed = {};
    const fields = ["id", "ip", "fingerprint", "text", "createdAt"];

    fields.forEach((field) => {
      transformed[field] = this[field];
    });

    return transformed;
  }
});

/**
 * Statics
 */
noteSchema.statics = {
  /**
   * Get note
   *
   * @param {ObjectId} id - The objectId of note.
   * @returns {Promise<Note, APIError>}
   */
  async get(id) {
    try {
      let note;

      if (mongoose.Types.ObjectId.isValid(id)) {
        note = await this.findById(id).exec();
      }
      if (note) {
        return note;
      }

      throw new APIError({
        message: "Note does not exist",
        status: httpStatus.NOT_FOUND
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * List notes in descending order of 'createdAt' timestamp.
   *
   * @param {number} skip - Number of notes to be skipped.
   * @param {number} limit - Limit number of notes to be returned.
   * @returns {Promise<Note[]>}
   */
  list(data) {
    const { ip } = data;
    return this.find({ ip })
      .sort({ createdAt: -1 })
      .exec();
  },

  /**
   * Return new validation error
   * if error is a mongoose duplicate key error
   *
   * @param {Error} error
   * @returns {Error|APIError}
   */
  checkDuplicateText(error) {
    if (error.name === "MongoError" && error.code === 11000) {
      return new APIError({
        message: "Validation Error",
        errors: [
          {
            field: "text",
            location: "body",
            messages: ['"text" already exists']
          }
        ],
        status: httpStatus.CONFLICT,
        isPublic: true,
        stack: error.stack
      });
    }
    return error;
  }
};

/**
 * @typedef Note
 */
module.exports = mongoose.model("Notes", noteSchema);
