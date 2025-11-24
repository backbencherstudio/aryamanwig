import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
    private readonly logger = new Logger(FirebaseService.name);

    constructor() {
        if (!admin.apps.length) {
            const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'); 

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
            this.logger.log('🔥 Firebase Admin Initialized Successfully');
        }
    }

    async pushToDevice(
        token: string,
        title: string,
        body: string,
        payload: any = {},
    ) {
        const message: admin.messaging.Message = {
            token,
            notification: { title, body },
            data: this._normalizePayload(payload),
            android: { priority: 'high' },
            apns: { 
                payload: { 
                    aps: { 
                        sound: 'default', 
                        alert: { title, body } 
                    } 
                } 
            },
        };

        try {
            const res = await admin.messaging().send(message);
            this.logger.log(`📨 Push notification sent: ${res}`);
            return res;
        } catch (err) {
            this.logger.error('❌ Firebase push error', err);
        }
    }

    private _normalizePayload(payload: any) {
        const normalized = {};
        for (const key in payload) {
            normalized[key] = String(payload[key]);
        }
        return normalized;
    }
}