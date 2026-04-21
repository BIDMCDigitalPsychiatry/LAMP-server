import { body } from "express-validator"

const credentialValidationRules = () => [
  body("access_key")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isLength({ max: 50 })
    .withMessage("Email must be less than 50 characters")
    .isEmail()
    .withMessage("Invalid email address"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 50 })
    .withMessage("Name must be less than 50 characters")
    .matches(/^[A-Za-z0-9\s]+$/)
    .withMessage("Name can only contain letters, numbers, and spaces"),
  body("secret_key")
    .trim()
    .notEmpty()
    .withMessage("password is required")
    .isLength({ min: 6, max: 50 })
    .withMessage("Password must be 6–50 characters long"),
]

const inputValidationRules = () => [
  body("name")
    .trim()
    .isLength({ max: 50 })
    .withMessage("Name must be less than 50 characters")
    .matches(/^[A-Za-z0-9\s\_]+$/)
    .withMessage("Name can only contain letters, numbers, and spaces"),
]

const sensorValidationRules = () => [
  body("name")
    .trim()
    .isLength({ max: 50 })
    .withMessage("Name must be less than 50 characters")
    .matches(/^[A-Za-z0-9\s\_]+$/)
    .withMessage("Name can only contain letters, numbers, and spaces"),
  body("spec").trim().isLength({ max: 50 }).withMessage("spec must be less than 50 characters"),
  body("id").trim().isLength({ max: 50 }).withMessage("Id must be less than 50 characters"),
]

const activityValidationRules = () => [
  body("name")
    .trim()
    .isLength({ max: 50 })
    .withMessage("Name must be less than 50 characters")
    .matches(/^[A-Za-z0-9\s\_]+$/)
    .withMessage("Name can only contain letters, numbers, and spaces"),
  body("spec").trim().isLength({ max: 50 }).withMessage("spec must be less than 50 characters"),
  body("id").trim().isLength({ max: 50 }).withMessage("Id must be less than 50 characters"),
]

const activitySpecValidationRules = () => [
  body("name")
    .trim()
    .isLength({ max: 50 })
    .withMessage("Name must be less than 50 characters")
    .matches(/^[A-Za-z0-9\s\_]+$/)
    .withMessage("Name can only contain letters, numbers, and spaces"),
  body("description").trim().isLength({ max: 50 }).withMessage("decription must be less than 50 characters"),
  body("executable").trim().isLength({ max: 50 }).withMessage("executable must be less than 50 characters"),
]
module.exports = {
  credentialValidationRules,
  inputValidationRules,
  sensorValidationRules,
  activityValidationRules,
  activitySpecValidationRules,
}
