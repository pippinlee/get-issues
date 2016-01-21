'use strict';
exports.issueContent = function issueContentTemplate(issue) {
  return `
  Issue Title: ${issue.title}
  Issue created by: ${issue.user.login}
  Issue created on: ${Date(issue.created_at)}

  ${issue.body}
  ------------------------------------------------------------------------------
  `;
};

exports.commentContent = function commentContentTemplate(comment) {
  /**
   * comment user.login
   * comment created_at
   *
   * comment body
   *
   * --------------------
   */
  return `
  Commenting User: ${comment.user.login}
  Commented on: ${Date(comment.created_at)}

  ${comment.body}
  ------------------------------------------------------------------------------
  `;
};