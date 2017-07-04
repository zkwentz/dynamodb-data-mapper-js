import {AttributeValue} from 'aws-sdk/clients/dynamodb';
import {Schema} from './Schema';

/**
 * The enumeration of types supported by this marshaller package.
 */
export const TypeTags = {
    Binary: 'Binary',
    BinarySet: 'BinarySet',
    Boolean: 'Boolean',
    Collection: 'Collection',
    Custom: 'Custom',
    Date: 'Date',
    Document: 'Document',
    Hash: 'Hash',
    List: 'List',
    Map: 'Map',
    Null: 'Null',
    Number: 'Number',
    NumberSet: 'NumberSet',
    String: 'String',
    StringSet: 'StringSet',
    Tuple: 'Tuple',
};

/**
 * A type understood by this marshaller package.
 */
export type TypeTag = keyof typeof TypeTags;

/**
 * An abstract base type defining the common characteristics of all SchemaTypes
 */
export interface BaseType {
    /**
     * The type of node represented by this object.
     */
    type: TypeTag;

    /**
     * The key in which this value will be persisted in DynamoDB. If not
     * provided, the key will be assumed to be the same in the input and in the
     * persisted record.
     */
    attributeName?: string;
}

function isBaseType(arg: any): arg is BaseType {
    return Boolean(arg) && typeof arg === 'object'
        && typeof arg.type === 'string'
        && arg.type in TypeTags
        && ['string', 'undefined'].indexOf(typeof arg.attributeName) > -1;
}

/**
 * A type used to constrain SchemaTypes that appear in lists and maps. Prohibits
 * the specification of an `attributeName`, which cannot be used in a ListType
 * or MapType node.
 */
export interface MemberType {
    attributeName?: undefined;
}

/**
 * The types of keys a given attribute can represent.
 */
export const KeyTypes = {
    HASH: 'HASH',
    RANGE: 'RANGE',
};

/**
 * A type of DynamoDB key.
 */
export type KeyType = keyof typeof KeyTypes;

/**
 * A configuration object that decorates schema nodes serving as keys.
 */
export interface KeyConfiguration {
    /**
     * The type of key represented by this node.
     */
    type: KeyType;
}

function isKeyConfiguration(arg: any): boolean {
    return Boolean(arg) && arg.type in KeyTypes;
}

/**
 * A configuration object that decorates schema nodes serving as index keys.
 */
export interface IndexKeyConfiguration extends KeyConfiguration {
    /**
     * The name of the index to which this key configuration applies.
     */
    indexName: string;
}

function isIndexKeyConfiguration(arg: any): boolean {
    return isKeyConfiguration(arg) && typeof arg.indexName === 'string';
}

/**
 * A trait applied to types that may contain a DynamoDB key.
 */
export interface KeyableType {
    /**
     * Key configuration as it pertains to the DynamoDB table.
     */
    keyConfiguration?: KeyConfiguration;

    /**
     * An array of key configurations as they apply to global and local
     * secondary indices.
     */
    indexKeyConfigurations?: Array<IndexKeyConfiguration>,
}

function isKeyableType(arg: object): boolean {
    const {keyConfiguration, indexKeyConfigurations} = arg as any;

    return (
        keyConfiguration === undefined ||
        isKeyConfiguration(keyConfiguration)
    ) && (
        indexKeyConfigurations === undefined ||
        (
            Array.isArray(indexKeyConfigurations) &&
            indexKeyConfigurations.map(isIndexKeyConfiguration)
                .filter(b => !b)
                .length === 0
        )
    );
}

/**
 * A node used to store binary data (e.g., Buffer, ArrayBuffer, or
 * ArrayBufferView objects).
 */
export interface BinaryType extends BaseType, KeyableType {
    type: 'Binary';
}

/**
 * A node used to store a set of binary values.
 */
export interface BinarySetType extends BaseType {
    type: 'BinarySet';
}

/**
 * A node used to store boolean values.
 */
export interface BooleanType extends BaseType {
    type: 'Boolean';
}

/**
 * A node used to store an untyped or mixed collection. Values provided for this
 * node will be marshalled using run-time type detection and may not be exactly
 * the same when unmarshalled.
 */
export interface CollectionType extends BaseType {
    type: 'Collection';
}

/**
 * A node whose type is not managed by the marshaller, but rather by the
 * `marshall` and `unmarshall` functions defined in this SchemaType. Useful for
 * objects not easily classified using the standard schema taxonomy.
 */
export interface CustomType<JsType> extends BaseType, KeyableType {
    type: 'Custom';

    /**
     * A function that converts an input value into a DynamoDB attribute value.
     * This function will not be invoked if the input value is undefined.
     *
     * @param input The value to be converted.
     */
    marshall: (input: JsType)=> AttributeValue;

    /**
     * A function that converts a DynamoDB AttributeValue into a JavaScript
     * value.
     *
     * @param persistedValue The value to be converted.
     */
    unmarshall: (persistedValue: AttributeValue) => JsType;
}

/**
 * A node represented by a Date object.
 *
 * Nodes of this type will be marshalled into DynamoDB Number types containing
 * the epoch timestamp of the date for use with DyanmoDB's Time-to-Live feature.
 *
 * Timezone information is not persisted.
 */
export interface DateType extends BaseType {
    type: 'Date';
}

/**
 * A constructor that takes no arguments.
 */
export interface ZeroArgumentsConstructor<T = any> {
    new (): T;
}

/**
 * A node represented by its own full Schema. Marshalled as an embedded map.
 */
export interface DocumentType extends BaseType {
    type: 'Document';

    /**
     * A Schema outlining how the members of this document are to be
     * (un)marshalled.
     */
    members: Schema;

    /**
     * A constructor to invoke to create an object onto which the document's
     * members will be unmarshalled. If not provided, `Object.create(null)` will
     * be used.
     */
    valueConstructor?: ZeroArgumentsConstructor;
}

/**
 * A node used to store a key => value mapping of mixed or untyped values.
 * Values provided for this node will be marshalled using run-time type
 * detection and may not be exactly the same when unmarshalled.
 */
export interface HashType extends BaseType {
    type: 'Hash';
}

/**
 * A node used to store an array or iterable of like values, e.g.,
 * `Array<string>`.
 *
 * @see CollectionType For untyped or mixed lists
 * @see TupleType For tuples
 */
export interface ListType extends BaseType {
    type: 'List';

    /**
     * The schema node by which each member of the list should be
     * (un)marshalled.
     */
    memberType: SchemaType & MemberType;
}

/**
 * A node used to store a mapping of strings to like values, e.g.,
 * `Map<string, ArrayBuffer>`.
 *
 * @see HashType For untyped of mixed hashes
 * @see DocumentType For strongly-typed documents
 */
export interface MapType extends BaseType {
    type: 'Map';
    memberType: SchemaType & MemberType;
}

/**
 * A node used to store null values.
 */
export interface NullType extends BaseType {
    type: 'Null';
}

/**
 * A node used to store a number value. Numbers should be representable as IEEE
 * 754 double precision floating point values to ensure no precision is lost
 * during (un)marshalling.
 */
export interface NumberType extends BaseType, KeyableType {
    type: 'Number';
    versionAttribute?: boolean;
}

/**
 * A node used to store a set of numbers.
 */
export interface NumberSetType extends BaseType {
    type: 'NumberSet';
}

/**
 * A node used to store a string value.
 */
export interface StringType extends BaseType, KeyableType {
    type: 'String';
}

/**
 * A node used to store a set of strings.
 */
export interface StringSetType extends BaseType {
    type: 'StringSet';
}

/**
 * A node used to store a fixed-length list of items, each of which may be of
 * a different type, e.g., `[boolean, string]`.
 */
export interface TupleType extends BaseType {
    type: 'Tuple';
    members: Array<SchemaType & MemberType>;
}

/**
 * A node in a Schema used by this marshaller package.
 */
export type SchemaType =
    BinaryType |
    BinarySetType |
    BooleanType |
    CustomType<any> |
    CollectionType |
    DateType |
    DocumentType |
    HashType |
    ListType |
    MapType |
    NullType |
    NumberType |
    NumberSetType |
    StringType |
    StringSetType |
    TupleType;

export function isSchemaType(arg: any): arg is SchemaType {
    if (isBaseType(arg)) {
        switch (arg.type) {
            case 'Binary':
            case 'String':
                return isKeyableType(arg);
            case 'Custom':
                return typeof (arg as CustomType<any>).marshall === 'function'
                    && typeof (arg as CustomType<any>).unmarshall === 'function';
            case 'Document': {
                const {valueConstructor, members} = arg as DocumentType;
                if (!members || typeof members !== 'object') {
                    return false;
                }

                for (let key of Object.keys(members)) {
                    if (!isSchemaType(members[key])) {
                        return false;
                    }
                }

                return ['function', 'undefined']
                    .indexOf(typeof valueConstructor) > -1;
            } case 'List':
            case 'Map':
                return isSchemaType((arg as ListType).memberType);
            case 'Number':
                return isKeyableType(arg) && ['boolean', 'undefined']
                    .indexOf(typeof (arg as NumberType).versionAttribute) > -1;
            case 'Tuple': {
                const {members} = arg as TupleType;
                if (!Array.isArray(members)) {
                    return false;
                }

                for (let member of members) {
                    if (!isSchemaType(member)) {
                        return false;
                    }
                }

                return true;
            } default:
                return true;
        }
    }

    return false;
}