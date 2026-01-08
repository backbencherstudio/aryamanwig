import { IsNotEmpty, IsString } from "class-validator";

export class FirebaseAuthDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @IsString()
  fcm_token?: string;
}
