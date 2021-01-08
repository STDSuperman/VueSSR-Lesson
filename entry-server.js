import { createApp } from './src/app';

export default content => {
    const { app } = createApp();
    return app;
}