// import mongoose from "mongoose"
import express, { Response, Request, NextFunction } from "express";
import { AdminModels } from "../../models/index";
import { userInterface } from "../../models/adminModel/ModelNewUser";
import { MESSAGES } from "../../utils/message";
import bcrypt from "bcrypt";
import http from "http-status-codes";
import Services from "../../services/index"
import { refresh_token_SecretKey } from "../../config/config"
import jwt from "jsonwebtoken"
import { genAuthToken, random_Otpfun ,verify_refresh_token} from "../../utils/auth";
import mongoose from "mongoose"
import {
	error_Object,
	resp_Object,
	responseType,
	Ilogin,
} from "../../utils/helperFun";
import {
	Controller,
	Route,
	Get,
	Post,
	Put,
	Delete,
	Query,
	Path,
	Tags,
	Body,
	Security,
	Example,
} from "tsoa";
import { put } from "../routes/userRoutes";
import { isAwaitExpression } from "typescript";

let refreshTokens: any = [];

@Tags("Admin")
@Route("/admin")
export class AdminController extends Controller {
	req: Request;
	res: Response;
	userId: string;
	userRole: number;
	constructor(req: Request, res: Response) {
		super();
		this.req = req;
		this.res = res;
		this.userId = req.body.user ? req.body.user._id : "";
		this.userRole = req.body.user ? req.body.user.role : null;
	};

	@Post("/user/create")
	public async New_Users(@Body() request: { role: number; fname: string; lname: string; email: string; mobileNum: number; password: string; father_name: string; mother_name: string;}): Promise<responseType | any> {
		try {
			const salt = await bcrypt.genSalt(10);
			const body = request;
			//  logic part of autogenerated username
			const today = new Date();
			const year = today.getFullYear().toString();
			const yearcode = parseInt(year.slice(-2));
			const usercount = await AdminModels.ModelNewUser.find({
				role: 3,
			}).count();
			const count: any = (usercount + 1).toString();
			const usercode = count.padStart(2, 0);
			// check if user alreday exist or not
			const finduser = await AdminModels.ModelNewUser.findOne({
				email: body.email,
			});
			console.log(finduser);
			if (finduser)
				throw new error_Object(
					MESSAGES.USER_ALREADY_REGISTERED,
					http.UNPROCESSABLE_ENTITY
				);
			body.password = await bcrypt.hash(body.password, salt);
			// // const student_img = req.file.path;
			// // Student_Data.student_img = student_img;

			// assigning a auto generated username to the user
			Object.assign(body, { username: "PS" + yearcode + usercode });

			const UserSaved: any = await new AdminModels.ModelNewUser(
				body
			).save(async (err, success) => {

				if (err) throw err
				const mail = await Services.mailer(body.email, "Successfull Registration", `Hello ${success.fname + " " + success.lname} You are Registered Successfully`)
				// console.log(mail,"maill controller side");
				// if(mail.mailError) throw mail.mailError

			});
			return new resp_Object(
				MESSAGES.USER_REGISTERED_SUCCESSFULLY,
				http.CREATED,
				UserSaved
			);
		} catch (error: any) {
			return { CatchError: error };
		}
	};

	@Post("/login")
	public async AdminLoginFun(
		@Body() request: { password: string; email: string }
	): Promise<responseType | any> {
		try {
			console.log(request, "request");

			const { email, password } = request;
			console.log(email, password, "email passs");
			// find if user exist or not
			const Userdata = await AdminModels.ModelNewUser.findOne({ email: email });
			if (!Userdata)
				throw new error_Object(MESSAGES.USER_NOT_VALID, http.UNAUTHORIZED);
			const user_id = Userdata._id;

			if (await bcrypt.compare(password, Userdata.password)) {

				if (Userdata.role === 1) {
					//generating jwt token
					const token = genAuthToken(user_id);
					if (!token)
						throw new error_Object(MESSAGES.TOKEN_NOT_GENERATED, http.NOT_FOUND);
					//   console.log(token, "token login side");
					refreshTokens.push(token.refresh_token);

					return new resp_Object(MESSAGES.LOGIN_SUCCESSFULLY, http.ACCEPTED, {
						AccessToken: token.Access_token,
						RefreshToken: token.refresh_token,
					});
				} else {
					throw new error_Object(
						MESSAGES.YOU_ARE_NOT_ADMIN,
						http.UNAUTHORIZED
					);
				}

			} else {
				throw new error_Object(
					MESSAGES.PASSWORD_NOT_MATCHED,
					http.UNAUTHORIZED
				);
			}
		} catch (error) {
			return { CatchError: error };
		}
	};

	@Security("Bearer")
	@Put("/user/update/:id")
	public async Update_userfun(@Body() request: { role: number; fname: string; lname: string; email: string; mobileNum: number; password: string; gender: string; father_name: string; religion: string; }, id: string): Promise<responseType | any> {
		try {
			const user_id = id;
			console.log(user_id, "idd");

			const body = request;
			console.log(body, "body or request");

			if (!body)
				throw new error_Object(
					"Something Not Right Data Not Recieved Please Enter Data",
					http.EXPECTATION_FAILED
				);

			const find = await AdminModels.ModelNewUser.findOne({ _id: user_id });
			if (!find)
				throw new error_Object(
					MESSAGES.DOES_NOT_EXIST,
					http.EXPECTATION_FAILED
				);

			const UserUpdated = await AdminModels.ModelNewUser.findByIdAndUpdate(
				user_id,
				body,
				{ new: true }
			);

			return new resp_Object(MESSAGES.UPDATED_SUCCESSFULLY, http.CREATED);
		} catch (error) {
			return { CatchError: error };
		}
	}
	@Security("Bearer")
	@Delete("/user/delete/:id")
	public async Delete_Userfun(id: string): Promise<responseType | any> {
		try {
			const user_id = id;
			console.log(user_id);
			const find = await AdminModels.ModelNewUser.findOne({ _id: user_id });
			if (!find)
				throw new error_Object(
					MESSAGES.DOES_NOT_EXIST,
					http.EXPECTATION_FAILED
				);

			const deleted = await AdminModels.ModelNewUser.findByIdAndDelete(user_id);
			console.log(deleted, "deleted");
			return new resp_Object(MESSAGES.DELETED_SUCCESSFULLY, http.ACCEPTED);
		} catch (error) {
			return { CatchError: error };
		}
	};
	@Security("Bearer")
	@Get("/users")
	public async User_detailsfun(): Promise<responseType | any> {
		try {
			console.log(this.userId, "userid token ");
			const users_details = await AdminModels.ModelNewUser.find(
				{ role: 3 },
				"father_name mobileNum fname gender"
			);

			return new resp_Object(
				MESSAGES.DATA_RETREIVE_SUCCESSFULLY,
				http.OK,
				users_details
			);
		} catch (error) {
			return { CatchError: error };
		}
	};


	// @Security("Bearer")
	// @Get("/users/{id}")
	// public async SingleUserDetail(@Path() paramsId:string) {
	//  try {
	//   const user_id = paramsId
	//   const userdata = await AdminModels.ModelNewUser.find(
	//     { _id: user_id },
	//     { password: 0 }
	//   );
	//   const response = new resp_Object(
	//     MESSAGES.DATA_RETREIVE_SUCCESSFULLY,
	//     http.OK,
	//     userdata
	//   );
	//   return { CatchResponse: response };
	// } catch (error) {
	//   return { CatchError: error };
	// }

	// };
	//--------------class functions-------------------------------
	@Security("Bearer")
	@Post("/class/create")
	public async addCourse(@Body() request: { Class: number; Class_Code: string; Admission_Fee: number; Monthly_Fee: number; }): Promise<responseType | any> {
		try {

			let ClassData = request;
			if(!ClassData) throw new error_Object("please enter data",404)

			// const FindClass = await AdminModels.ModelNewCource.find({ $or:[{Class: ClassData.Class},{ Class_Code:ClassData.Class_Code}]});
			const FindClass = await AdminModels.ModelNewCource.findOne({ 
				Class: ClassData.Class,	
			   });
			   const FindClassCode = await AdminModels.ModelNewCource.findOne({ 
				Class_Code:ClassData.Class_Code,
	
			   });
			console.log(FindClass,"findclass");

			if(FindClass){
			      throw new error_Object("Class  Already Register",409)
				  
			}
			if(FindClassCode){
				throw new error_Object(" Class Code Already Register",409)
				
		  }
			await new AdminModels.ModelNewCource(ClassData).save();
		   return new resp_Object(MESSAGES.CLASS_REGISTERED_SUCCESSFULLY, http.CREATED)

			// if (FindClass.length === 1){
			// 	throw new error_Object("Class Already Registered", http.CONFLICT)

			// }else if (FindClass.length > 1){
			// 	throw new error_Object("Class Code Already Registered", http.CONFLICT)

			// }else{
			// 	 await new AdminModels.ModelNewCource(ClassData).save();
			// 	 return new resp_Object(MESSAGES.CLASS_REGISTERED_SUCCESSFULLY, http.CREATED)
			// }
		} catch (error) {
			return { CatchError: error };
		}
	};

	@Security("Bearer")
	@Put("class/update/:id")
	public async updateClass(@Body() request: { Class: number; Admission_Fee: number; Class_Code: string; Monthly_Fee: number; }, id: string): Promise<responseType | any> {
		try {
			const updates = request;
			const options = { new: true };
			const result = await AdminModels.ModelNewCource.findByIdAndUpdate(id, updates, options);
			if (!result) throw new error_Object(MESSAGES.DOES_NOT_EXIST, http.NOT_FOUND);

			return new resp_Object(MESSAGES.CLASS_UPDATED_SUCCESSFULLY, http.NO_CONTENT, result);
		} catch (error) {
			return { CatchError: error };
		}
	};

	@Security('Bearer')
	@Delete('/class/delete/:id')
	public async deleteClass(id: string): Promise<responseType | any> {
		try {
			const data = await AdminModels.ModelNewCource.deleteOne({ _id: id });
			console.log(data, "data..");
			if (!data) throw new error_Object(MESSAGES.DOES_NOT_EXIST, http.BAD_REQUEST);
			return new resp_Object(MESSAGES.DELETED_SUCCESSFULLY, http.NO_CONTENT);
		} catch (error) {
			return { CatchError: error };
		}
	};

	@Security('Bearer')
	@Get('/classes')
	public async get_classes(): Promise<responseType | any> {
		try {
			const get_classes = await AdminModels.ModelNewCource.find({}, { addmission_fee: 0, monthly_fee: 0 });

			return new resp_Object(MESSAGES.DATA_RETREIVE_SUCCESSFULLY, http.OK, get_classes)

		} catch (error) {
			return { CatchError: error }
		}
	};
	//---------------------------student functions ------------------------------//
	@Security('Bearer')
	@Post('/student/create')
	public async Add_Student(@Body() request: { userId: string, classId: string, IsActive: Boolean }): Promise<responseType | any> {
		try {
			const body = request
			const FindClass = await AdminModels.ModelNewCource.findById({ _id: body.classId });
			//  console.log(className);
			if (!FindClass) throw new error_Object(MESSAGES.INVALID_ID_OR_DATA_DOES_NOT_EXIST, http.NOT_FOUND)
			const ClassName = FindClass.Class;

			const finduser = await AdminModels.ModelNewStudent.find({
				userId: body.userId,
				classId: body.classId,
			});
			console.log(finduser, "find userrrrrrr");
			if (finduser.length > 0) {
				console.log("already");
				throw new error_Object(MESSAGES.STUDENT_ALREADY_REGISTERED_WITH_SAME_CLASS, http.CONFLICT)
			} else {
				const ClassCount = await AdminModels.ModelNewStudent.find({
					class_id: body.classId,
				}).count();
				// console.log(countt,"same class count");

				Object.assign(body, { roll_num: ClassName * 1000 + 1 + ClassCount });
				const Store_Student = await new AdminModels.ModelNewStudent(body).save();
				return new resp_Object(MESSAGES.STUDENT_REGISTERED_SUCCESSFULLY, http.CREATED, Store_Student)

			}
		} catch (error) {
			return { CatchError: error }

		}
	};

	@Security('Bearer')
	@Put('/student/update/:id')
	public async updateStudent(@Body() request: { class_id: string; user_id: string; }, id: string): Promise<responseType | any> {
		try {
			const updates = request;
			const result = await AdminModels.ModelNewStudent.findByIdAndUpdate(id, updates, { new: true });
			if (!result) throw new error_Object(MESSAGES.INVALID_ID_OR_DATA_DOES_NOT_EXIST, http.NOT_FOUND);

			return new resp_Object(MESSAGES.STUDENT_UPDATED_SUCCESSFULLY, http.NO_CONTENT, result);
		} catch (error) {
			return { CatchError: error }

		}
	};

	@Security('Bearer')
	@Delete('/student/delete/:id')
	public async deleteStudent(id: string): Promise<responseType | any> {
		try {

			const UserDeleted = await AdminModels.ModelNewStudent.findByIdAndUpdate(id, { IsActive: false }, { new: true });
			// const data = await AdminModels.ModelNewStudent.deleteOne({ _id: id });
			if (!UserDeleted) throw new error_Object(MESSAGES.INVALID_ID_OR_DATA_DOES_NOT_EXIST, http.NOT_FOUND);
			return new resp_Object(MESSAGES.STUDENT_DELETED_SUCCESSFULLY, http.NO_CONTENT);
		} catch (error) {
			return { CatchError: error }

		}
	};

	  @Security('Bearer')
	  @Get('/students')
	  public async get_Students(@Query() page: number|any,@Query() size: number | any ): Promise<responseType | any> {
		try {
		//   let { page, size } 
		  if (!page) {
			page = 1;
		  }
		  if (!size) {
			size = 2;
		  }
		  const limit = parseInt(size);
		  const skip = (page - 1) * size;
		  const fetchdata = await AdminModels.ModelNewStudent.find({ IsActive:true })
			.limit(limit)
			.skip(skip)
			.sort({ updatedAt: -1 });
		  return new resp_Object("Student Data", 200, fetchdata);
		} catch (error) {
		  return { errors: error };
		}
	  }

	//--------------------refresh token-----------------------------
	@Security('Bearer')
	@Post('/login/refreshtoken')
	public async renew_token(@Body() request: { refresh_token: string }): Promise<responseType | any> {
		try {
			const { refresh_token } = request
			if(!refresh_token) throw new error_Object("please enter  data",404)
			console.log(refresh_token,"controller side");

			if (refresh_token || refreshTokens.includes(refresh_token)) {
				const verify: any =  await verify_refresh_token(refresh_token)
				// const verify: any =  jwt.verify(refresh_token, refresh_token_SecretKey)
				if (verify.verify_err) {
					console.log(verify.verify_err,"verify_err sideeeeeeeeeeee");	
					throw verify.verify_err
				}
				// new error_Object("invalid token please check", 422)
				console.log(verify, "verifyyyy");
				const New_Access_token = genAuthToken(verify._id);
				if (New_Access_token) {
					return new resp_Object(MESSAGES.TOKEN_GENERATED_SUCCESSFULLY, http.CREATED, { NewAccesstoken: New_Access_token.Access_token })
				}
			}
		} catch (error) {
			console.log(error, "catch side err");

			return { CatchError: error }

		}
	};

};
