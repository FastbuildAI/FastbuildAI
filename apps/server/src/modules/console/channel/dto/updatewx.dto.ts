import { IsInt, IsNotEmpty, IsString } from "class-validator";

import { MessageEncryptType } from "../interface/wxoaconfig.constant";

export class UpdateWxOaConfigDto {
    /**
     * 公众号appId
     */
    @IsNotEmpty()
    @IsString()
    appId: string;
    /**
     * 公众号appSecret
     */
    @IsNotEmpty()
    @IsString()
    appSecret: string;

    /**
     * 公众号token
     */
    @IsNotEmpty()
    @IsString()
    token: string;

    /**
     * 消息加密密钥
     */
    @IsNotEmpty()
    @IsString()
    encodingAESKey: string;

    /**
     * 消息加密类型
     */
    @IsNotEmpty()
    @IsString()
    messageEncryptType: MessageEncryptType;
}
