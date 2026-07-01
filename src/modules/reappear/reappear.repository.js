// src/modules/reappear/reappear.repository.js

const prisma = require("../../config/db");

async function createApplication(schoolId, studentId, subjectId, sessionId, semesterNumber, reason) {
  return prisma.reappearApplication.create({
    data: { schoolId, studentId, subjectId, sessionId, semesterNumber, reason },
    include: {
      subject: { select: { name: true, courseCode: true } },
      session: { select: { name: true } },
    },
  });
}

/**
 * Finds an existing pending/approved application for the same subject+session.
 * Prevents duplicate applications.
 */
async function findDuplicate(studentId, subjectId, sessionId) {
  return prisma.reappearApplication.findFirst({
    where: { studentId, subjectId, sessionId, status: { in: ["pending", "approved"] } },
  });
}

async function getById(id, schoolId) {
  return prisma.reappearApplication.findFirst({
    where: { id, schoolId },
    include: {
      student: { include: { user: { select: { id: true, name: true, email: true } } } },
      subject: { select: { name: true, courseCode: true } },
      session: { select: { name: true } },
    },
  });
}

async function getStudentApplications(studentId) {
  return prisma.reappearApplication.findMany({
    where: { studentId },
    include: {
      subject: { select: { name: true, courseCode: true } },
      session: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function deleteApplication(id) {
  return prisma.reappearApplication.delete({ where: { id } });
}

async function getDeptApplications(schoolId, departmentId, status) {
  return prisma.reappearApplication.findMany({
    where: {
      schoolId,
      ...(status ? { status } : {}),
      student: { departmentId },
    },
    include: {
      student: { include: { user: { select: { name: true, email: true } } } },
      subject: { select: { name: true, courseCode: true } },
      session: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function approveApplication(id, hodFacultyId, comment) {
  return prisma.reappearApplication.update({
    where: { id },
    data: { status: "approved", hodComment: comment, reviewedByHodId: hodFacultyId, reviewedAt: new Date() },
  });
}

async function rejectApplication(id, hodFacultyId, comment) {
  return prisma.reappearApplication.update({
    where: { id },
    data: { status: "rejected", hodComment: comment, reviewedByHodId: hodFacultyId, reviewedAt: new Date() },
  });
}

/**
 * Sets invalidatedAt on the student's original (non-reappear) mark for this subject.
 * The invalidated mark is excluded from all CGPA computations and student result views.
 */
async function invalidateOriginalMark(studentId, subjectId, sessionId) {
  const mark = await prisma.subjectMark.findFirst({
    where: {
      studentId, subjectId, isReappear: false, invalidatedAt: null,
      publication: { sessionId },
    },
  });
  if (!mark) return null;

  await prisma.subjectMark.update({ where: { id: mark.id }, data: { invalidatedAt: new Date() } });
  return mark;
}

/**
 * Gets all approved reappear applications for subjects assigned to a faculty.
 *
 * Each returned row also carries a resolved `publicationId`. The
 * reappearApplication table has no direct foreign key to a ResultPublication,
 * but POST /results/submit-reappear requires one. ResultPublication has a
 * unique index on (sessionId, departmentId, batchYear, semesterNumber), and
 * an application's session/semester plus its student's department/batchYear
 * are exactly that key — so we look up the matching PUBLISHED publication
 * for each application and attach its id. A batched findMany (one extra
 * query total) is used instead of one lookup per application to avoid N+1
 * queries.
 */
async function getActiveReappearForFaculty(facultyId, schoolId) {
  const assignments = await prisma.facultyAssignment.findMany({
    where: { facultyId, schoolId },
    select: { subjectId: true, sessionId: true },
  });
  if (!assignments.length) return [];

  const applications = await prisma.reappearApplication.findMany({
    where: {
      schoolId,
      status: "approved",
      OR: assignments.map((a) => ({ subjectId: a.subjectId, sessionId: a.sessionId })),
    },
    include: {
      student: { include: { user: { select: { name: true, email: true } } } },
      subject: { select: { name: true, courseCode: true } },
      session: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!applications.length) return [];

  // Fetch every PUBLISHED publication that could match any application's
  // (sessionId, departmentId, batchYear, semesterNumber) combo, in one query.
  const publications = await prisma.resultPublication.findMany({
    where: {
      status: "published",
      OR: applications.map((a) => ({
        sessionId: a.sessionId,
        departmentId: a.student.departmentId,
        batchYear: a.student.batchYear,
        semesterNumber: a.semesterNumber,
      })),
    },
    select: { id: true, sessionId: true, departmentId: true, batchYear: true, semesterNumber: true },
  });

  // Join key built from the same 4 fields on both sides, so each application
  // can find its match in a Map lookup instead of re-scanning the list.
  const keyOf = (o) => `${o.sessionId}_${o.departmentId}_${o.batchYear}_${o.semesterNumber}`;
  const publicationIdByKey = new Map(publications.map((p) => [keyOf(p), p.id]));

  return applications.map((a) => ({
    ...a,
    // null when no published publication exists yet for this combo — the
    // frontend should treat that as "not ready to submit reappear marks".
    publicationId: publicationIdByKey.get(
      keyOf({
        sessionId:      a.sessionId,
        departmentId:   a.student.departmentId,
        batchYear:      a.student.batchYear,
        semesterNumber: a.semesterNumber,
      })
    ) ?? null,
  }));
}

module.exports = {
  createApplication, findDuplicate, getById, getStudentApplications,
  deleteApplication, getDeptApplications, approveApplication, rejectApplication,
  invalidateOriginalMark, getActiveReappearForFaculty,
};
