/* eslint-disable arrow-body-style */
/* eslint-disable no-unused-expressions */
const request = require("supertest");
const httpStatus = require("http-status");
const { expect } = require("chai");
const { some, omitBy, isNil } = require("lodash");
const app = require("../../../index");
const Note = require("../../models/notes.model");

/**
 * root level hooks
 */

async function format(note) {
  const formated = note;

  // get notes from database
  const dbNote = (await Note.findOne({ email: note.email })).transform();

  // remove null and undefined properties
  return omitBy(dbNote, isNil);
}

describe("Notes API", async () => {
  let dbNotes;
  let note;

  beforeEach(async () => {
    dbNotes = {
      Note1: {
        text:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
      },
      Note2: {
        text:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
      }
    };

    note = {
      text:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
    };

    await Note.remove({});
    await Note.insertMany([dbNotes.Note1, dbNotes.Note2]);
  });

  describe("POST /v1/notes", () => {
    it("should create a new note when request is ok", () => {
      return request(app)
        .post("/v1/notes")
        .send(note)
        .expect(httpStatus.CREATED)
        .then((res) => {
          expect(res.body).to.include(note);
        });
    });

    it('should create a new note and set default role to "note"', () => {
      return request(app)
        .post("/v1/notes")
        .send(note)
        .expect(httpStatus.CREATED)
        .then((res) => {
          expect(res.body.role).to.be.equal("note");
        });
    });

    it("should report error when email already exists", () => {
      return request(app)
        .post("/v1/notes")
        .send(note)
        .expect(httpStatus.CONFLICT)
        .then((res) => {
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(location).to.be.equal("body");
          expect(messages).to.include('"note" already exists');
        });
    });

    it("should report error when email is not provided", () => {
      delete note.text;

      return request(app)
        .post("/v1/notes")
        .send(note)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal("email");
          expect(location).to.be.equal("body");
          expect(messages).to.include('"email" is required');
        });
    });

    it("should report error when password length is less than 6", () => {
      note.password = "12345";

      return request(app)
        .post("/v1/notes")
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send(note)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal("password");
          expect(location).to.be.equal("body");
          expect(messages).to.include(
            '"password" length must be at least 6 characters long'
          );
        });
    });

    it("should report error when logged note is not an admin", () => {
      return request(app)
        .post("/v1/notes")
        .send(note)
        .expect(httpStatus.FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.FORBIDDEN);
          expect(res.body.message).to.be.equal("Forbidden");
        });
    });
  });

  describe("GET /v1/notes", () => {
    it("should get all notes", () => {
      return request(app)
        .get("/v1/notes")
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK)
        .then(async (res) => {
          const bran = format(dbNotes.branStark);
          const john = format(dbNotes.jonSnow);

          const includesBranStark = some(res.body, bran);
          const includesjonSnow = some(res.body, john);

          // before comparing it is necessary to convert String to Date
          res.body[0].createdAt = new Date(res.body[0].createdAt);
          res.body[1].createdAt = new Date(res.body[1].createdAt);

          expect(res.body).to.be.an("array");
          expect(res.body).to.have.lengthOf(2);
          expect(includesBranStark).to.be.true;
          expect(includesjonSnow).to.be.true;
        });
    });

    it("should get all notes with pagination", () => {
      return request(app)
        .get("/v1/notes")
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .query({ page: 2, perPage: 1 })
        .expect(httpStatus.OK)
        .then((res) => {
          delete dbNotes.jonSnow.password;
          const john = format(dbNotes.jonSnow);
          const includesjonSnow = some(res.body, john);

          // before comparing it is necessary to convert String to Date
          res.body[0].createdAt = new Date(res.body[0].createdAt);

          expect(res.body).to.be.an("array");
          expect(res.body).to.have.lengthOf(1);
          expect(includesjonSnow).to.be.true;
        });
    });

    it("should filter notes", () => {
      return request(app)
        .get("/v1/notes")
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .query({ email: dbNotes.jonSnow.email })
        .expect(httpStatus.OK)
        .then((res) => {
          delete dbNotes.jonSnow.password;
          const john = format(dbNotes.jonSnow);
          const includesjonSnow = some(res.body, john);

          // before comparing it is necessary to convert String to Date
          res.body[0].createdAt = new Date(res.body[0].createdAt);

          expect(res.body).to.be.an("array");
          expect(res.body).to.have.lengthOf(1);
          expect(includesjonSnow).to.be.true;
        });
    });

    it("should report error when pagination's parameters are not a number", () => {
      return request(app)
        .get("/v1/notes")
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .query({ page: "?", perPage: "whaat" })
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal("page");
          expect(location).to.be.equal("query");
          expect(messages).to.include('"page" must be a number');
          return Promise.resolve(res);
        })
        .then((res) => {
          const { field } = res.body.errors[1];
          const { location } = res.body.errors[1];
          const { messages } = res.body.errors[1];
          expect(field).to.be.equal("perPage");
          expect(location).to.be.equal("query");
          expect(messages).to.include('"perPage" must be a number');
        });
    });

    it("should report error if logged note is not an admin", () => {
      return request(app)
        .get("/v1/notes")
        .set("Authorization", `Bearer ${noteAccessToken}`)
        .expect(httpStatus.FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.FORBIDDEN);
          expect(res.body.message).to.be.equal("Forbidden");
        });
    });
  });

  describe("GET /v1/notes/:noteId", () => {
    it("should get note", async () => {
      const id = (await Note.findOne({}))._id;
      delete dbNotes.branStark.password;

      return request(app)
        .get(`/v1/notes/${id}`)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body).to.include(dbNotes.branStark);
        });
    });

    it('should report error "Note does not exist" when note does not exists', () => {
      return request(app)
        .get("/v1/notes/56c787ccc67fc16ccc1a5e92")
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal("Note does not exist");
        });
    });

    it('should report error "Note does not exist" when id is not a valid ObjectID', () => {
      return request(app)
        .get("/v1/notes/palmeiras1914")
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.equal("Note does not exist");
        });
    });

    it("should report error when logged note is not the same as the requested one", async () => {
      const id = (await Note.findOne({ email: dbNotes.branStark.email }))._id;

      return request(app)
        .get(`/v1/notes/${id}`)
        .set("Authorization", `Bearer ${noteAccessToken}`)
        .expect(httpStatus.FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.FORBIDDEN);
          expect(res.body.message).to.be.equal("Forbidden");
        });
    });
  });

  describe("PUT /v1/notes/:noteId", () => {
    it("should replace note", async () => {
      delete dbNotes.branStark.password;
      const id = (await Note.findOne(dbNotes.branStark))._id;

      return request(app)
        .put(`/v1/notes/${id}`)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send(note)
        .expect(httpStatus.OK)
        .then((res) => {
          delete note.password;
          expect(res.body).to.include(note);
          expect(res.body.role).to.be.equal("note");
        });
    });

    it("should report error when email is not provided", async () => {
      const id = (await Note.findOne({}))._id;
      delete note.email;

      return request(app)
        .put(`/v1/notes/${id}`)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send(note)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal("email");
          expect(location).to.be.equal("body");
          expect(messages).to.include('"email" is required');
        });
    });

    it("should report error note when password length is less than 6", async () => {
      const id = (await Note.findOne({}))._id;
      note.password = "12345";

      return request(app)
        .put(`/v1/notes/${id}`)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send(note)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal("password");
          expect(location).to.be.equal("body");
          expect(messages).to.include(
            '"password" length must be at least 6 characters long'
          );
        });
    });

    it('should report error "Note does not exist" when note does not exists', () => {
      return request(app)
        .put("/v1/notes/palmeiras1914")
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal("Note does not exist");
        });
    });

    it("should report error when logged note is not the same as the requested one", async () => {
      const id = (await Note.findOne({ email: dbNotes.branStark.email }))._id;

      return request(app)
        .put(`/v1/notes/${id}`)
        .set("Authorization", `Bearer ${noteAccessToken}`)
        .expect(httpStatus.FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.FORBIDDEN);
          expect(res.body.message).to.be.equal("Forbidden");
        });
    });

    it("should not replace the role of the note (not admin)", async () => {
      const id = (await Note.findOne({ email: dbNotes.jonSnow.email }))._id;
      const role = "admin";

      return request(app)
        .put(`/v1/notes/${id}`)
        .set("Authorization", `Bearer ${noteAccessToken}`)
        .send(admin)
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body.role).to.not.be.equal(role);
        });
    });
  });

  describe("PATCH /v1/notes/:noteId", () => {
    it("should update note", async () => {
      delete dbNotes.branStark.password;
      const id = (await Note.findOne(dbNotes.branStark))._id;
      const { name } = note;

      return request(app)
        .patch(`/v1/notes/${id}`)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send({ name })
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body.name).to.be.equal(name);
          expect(res.body.email).to.be.equal(dbNotes.branStark.email);
        });
    });

    it("should not update note when no parameters were given", async () => {
      delete dbNotes.branStark.password;
      const id = (await Note.findOne(dbNotes.branStark))._id;

      return request(app)
        .patch(`/v1/notes/${id}`)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body).to.include(dbNotes.branStark);
        });
    });

    it('should report error "Note does not exist" when note does not exists', () => {
      return request(app)
        .patch("/v1/notes/palmeiras1914")
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal("Note does not exist");
        });
    });

    it("should report error when logged note is not the same as the requested one", async () => {
      const id = (await Note.findOne({ email: dbNotes.branStark.email }))._id;

      return request(app)
        .patch(`/v1/notes/${id}`)
        .set("Authorization", `Bearer ${noteAccessToken}`)
        .expect(httpStatus.FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.FORBIDDEN);
          expect(res.body.message).to.be.equal("Forbidden");
        });
    });

    it("should not update the role of the note (not admin)", async () => {
      const id = (await Note.findOne({ email: dbNotes.jonSnow.email }))._id;
      const role = "admin";

      return request(app)
        .patch(`/v1/notes/${id}`)
        .set("Authorization", `Bearer ${noteAccessToken}`)
        .send({ role })
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body.role).to.not.be.equal(role);
        });
    });
  });

  describe("DELETE /v1/notes", () => {
    it("should delete note", async () => {
      const id = (await Note.findOne({}))._id;

      return request(app)
        .delete(`/v1/notes/${id}`)
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NO_CONTENT)
        .then(() => request(app).get("/v1/notes"))
        .then(async () => {
          const notes = await Note.find({});
          expect(notes).to.have.lengthOf(1);
        });
    });

    it('should report error "Note does not exist" when note does not exists', () => {
      return request(app)
        .delete("/v1/notes/palmeiras1914")
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal("Note does not exist");
        });
    });

    it("should report error when logged note is not the same as the requested one", async () => {
      const id = (await Note.findOne({ email: dbNotes.branStark.email }))._id;

      return request(app)
        .delete(`/v1/notes/${id}`)
        .set("Authorization", `Bearer ${noteAccessToken}`)
        .expect(httpStatus.FORBIDDEN)
        .then((res) => {
          expect(res.body.code).to.be.equal(httpStatus.FORBIDDEN);
          expect(res.body.message).to.be.equal("Forbidden");
        });
    });
  });
});
