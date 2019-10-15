# Lint as: python3
"""
Validates whether the clinical concepts defined in the listed JSON files
meet the schema for clinical concepts, and whether the hierarchies defined
in them are sane.
"""
import json

from jsonschema import validate
from typing import List

CLINICAL_CONCEPT_SCHEMA_FILE = 'clinical_concept_schema.json'
CLINICAL_CONCEPT_FILES = ['lab_results.json']
GROUPS_SCHEMA_FILE = 'group_schema.json'
GROUPS_FILES = ['lab_groups.json']
GROUP_NAME_KEY = 'groupName'
PARENT_GROUP_NAME_KEY = 'parentGroupName'


def validate_groups(groups_schema_file: str,
                    groups_files: List[str]) -> (List[str], List[str]):
    """
    Validate the groups files.

    First validates the groups file against the schema and prints out
    any errors. Then, checks the hierarchy of groups to ensure:

    1) Every group referenced as a parent group exists
    2) The hierarchy only goes one level deep

    Args:
        groups_schema_file: The file name of the schema for the group structure
        groups_files: A list of files that contain groups

    Returns:
        A tuple where the first member is a list of group names and the second
        member is a list of parent group names
    """
    groups = []
    parent_groups = []
    groups_with_parents = []
    with open(groups_schema_file) as group_schema:
        schema = json.load(group_schema)

    for file in groups_files:
        with open(file) as data_file:
            data = json.load(data_file)
        for item in data:
            validate(instance=item, schema=schema)
            groups.append(item[GROUP_NAME_KEY])
            if PARENT_GROUP_NAME_KEY in item:
                parent_groups.append(item[PARENT_GROUP_NAME_KEY])
                groups_with_parents.append(item[GROUP_NAME_KEY])

    # Make sure that all parent groups are valid groups.
    for group in parent_groups:
        if group not in groups:
            print("ERROR: Parent group {} undefined.".format(group))

    # Make sure the hierarchy is single-leveled and non-circular.
    parent_group_set = set(parent_groups)
    groups_with_parents_set = set(groups_with_parents)

    overlap = parent_group_set.intersection(groups_with_parents_set)
    if overlap:
        print("ERROR: Groups [{}] listed as both parents and children.".
              format(', '.join(overlap)))

    return groups, parent_groups


def validate_clinical_concepts(
        clinical_concept_schema_file: str, clinical_concept_files: List[str],
        group_names) -> None:
    """
    Validates clinical concept files.

    Validates the files against the schema, then checks to see that if there
    is a parent group referenced, it is one of the parent groups for
    a concept.

    Args:
        clinical_concept_schema_file: The schema file for clinical concepts.
        clinical_concept_files: The file containing the definition of concepts.
        group_names: Names of defined groups.
    """
    # Validate the concepts schema and check to make sure they don't reference
    # any undefined groups (or any parent groups--the hierarchy
    # is single-leveled.)
    with open(clinical_concept_schema_file) as schema_file:
        schema = json.load(schema_file)
    for file in clinical_concept_files:
        with open(file) as data_file:
            data = json.load(data_file)
            for item in data:
                validate(instance=item, schema=schema)
                if GROUP_NAME_KEY in item:
                    group = item[GROUP_NAME_KEY]
                    if group not in group_names:
                        print("ERROR: {} not represented in {}.".format(
                            group, GROUPS_SCHEMA_FILE))


def main():
    # Validate the group schema and make a list of valid groups.
    (groups, parent_groups) = validate_groups(GROUPS_SCHEMA_FILE, GROUPS_FILES)

    validate_clinical_concepts(CLINICAL_CONCEPT_SCHEMA_FILE,
                               CLINICAL_CONCEPT_FILES, groups + parent_groups)


if __name__ == '__main__':
    main()
