import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import {
    Flag,
    FlagpoleType,
    FlagGroupModule,
    VideoFlag,
    buildFlagpole,
    computeFlagOptionsFromImage,
    loadImage,
    loadVideo
} from '../../flagwaver';
import withAppContext from '../hocs/withAppContext';
import { getObject } from '../utils/BlobUtils';

const DEFAULT_FLAG_IMAGE_PATH = `${process.env.ROOT_URL}/assets/img/flag-default.png`;

const copyProperties = (object, keys) => keys.reduce((result, key) => {
    result[key] = object[key];

    return result;
}, {});

const isVideoSrc = (src) => {
    const file = getObject(src);

    return (file && file.type.match(/video\/.*/)) ||
        src.match(/\.(3gp|avi|flv|mov|mp4|mpg|ogg|webm|wmv)$/);
};

function FlagGroup({ app, options, addToast }) {
    const module = useRef();

    const updateFlag = (flag) => {
        app.remove(module.current);

        const flagpoleOptions = copyProperties(options, [
            'flagpoleType',
            'verticalHoisting'
        ]);

        module.current = new FlagGroupModule({
            flagpole: buildFlagpole(flagpoleOptions, flag),
            flag: flag
        });

        if (
            flagpoleOptions.flagpoleType === FlagpoleType.HORIZONTAL ||
            flagpoleOptions.flagpoleType === FlagpoleType.OUTRIGGER
        ) {
            const flagGroup = module.current.subject;
            const flagpole = flagGroup.flagpole;
            const poleLength = flagpole.constructor.defaults.poleLength;

            // Center top of flagpole
            flagGroup.object.position
                .set(0, poleLength, 0)
                .sub(flagpole.top);
        }

        app.add(module.current);
        app.render();
        app.needsUpdate = true;
    };

    const renderModule = () => {
        const { imageSrc } = options;

        const src = imageSrc || DEFAULT_FLAG_IMAGE_PATH;

        const textureOptions = copyProperties(options, [
            'width',
            'height',
            'hoisting',
            'orientation',
            'resolution'
        ]);

        const flagOptions = copyProperties(options, [
            'mass',
            'restDistance'
        ]);

        (new Promise((resolve, reject) => {
            if (isVideoSrc(src)) {
                const isBrowserIE11 = window.document.documentMode;

                if (isBrowserIE11) {
                    reject('Browser feature not supported.');
                } else {
                    loadVideo(
                        src,
                        (video) => {
                            resolve(new VideoFlag({
                                ...flagOptions,
                                ...computeFlagOptionsFromImage({
                                    ...textureOptions,
                                    image: video
                                })
                            }));
                        },
                        (e) => {
                            reject('Video could not be loaded.');
                        }
                    );
                }
            } else {
                loadImage(
                    src,
                    (image) => {
                        resolve(new Flag({
                            ...flagOptions,
                            ...computeFlagOptionsFromImage({
                                ...textureOptions,
                                image: image
                            })
                        }));
                    },
                    (e) => {
                        reject('Image could not be loaded.');
                    }
                );
            }
        }))
            .then((flag) => {
                updateFlag(flag);
            })
            .catch((error) => {
                updateFlag(new Flag(flagOptions));

                addToast({
                    status: 'error',
                    message: error
                });
            });
    };

    useEffect(() => {
        module.current = new FlagGroupModule();

        app.add(module.current);
        app.needsUpdate = true;

        renderModule();

        return () => {
            app.remove(module.current);
        };
    }, []);

    useEffect(() => {
        renderModule();
    }, [options]);

    return null;
}

FlagGroup.propTypes = {
    app: PropTypes.object.isRequired,
    options: PropTypes.object.isRequired,
    addToast: PropTypes.func.isRequired
};

export default withAppContext(FlagGroup);
