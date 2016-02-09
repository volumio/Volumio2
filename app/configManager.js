/**
 * Created by massi on 08/02/16.
 */
module.exports = ConfigManager;

function ConfigManager(logger) {
    this.logger=logger;
}

ConfigManager.prototype.setUIConfigParam=function(data,path,value)
{

    if(data!=undefined && path!=undefined)
    {
        var splitted=path.split('.');
        var current= data;

        for(var i in splitted)
        {
            var field=splitted[i];

            var squareIndex=field.indexOf('[');
            if(squareIndex>-1)
            {
                var squareSplitted=field.split('[');

                var arrayIndex=parseInt(squareSplitted[1].slice(0,squareSplitted[1].indexOf(']')));

                if(current[squareSplitted[0]]!=undefined &&
                   current[squareSplitted[0]][arrayIndex]!=undefined)
                {
                    if(i<(splitted.length-1))
                        current=current[squareSplitted[0]][arrayIndex];
                    else current[squareSplitted[0]][arrayIndex]=value;

                }
            }
            else{
                if(current[field]!=undefined)
                {
                    if(i<(splitted.length-1))
                        current=current[field];
                    else current[field]=value;
                }
            }

        }
    }

}

ConfigManager.prototype.pushUIConfigParam=function(data,path,value)
{

    if(data!=undefined && path!=undefined)
    {
        var splitted=path.split('.');
        var current= data;

        for(var i in splitted)
        {
            var field=splitted[i];

            var squareIndex=field.indexOf('[');
            if(squareIndex>-1)
            {
                var squareSplitted=field.split('[');

                var arrayIndex=parseInt(squareSplitted[1].slice(0,squareSplitted[1].indexOf(']')));

                if(current[squareSplitted[0]]!=undefined &&
                    current[squareSplitted[0]][arrayIndex]!=undefined)
                {
                    if(i<(splitted.length-1))
                        current=current[squareSplitted[0]][arrayIndex];
                    else current[squareSplitted[0]][arrayIndex].push(value);

                }
            }
            else{
                if(current[field]!=undefined)
                {
                    if(i<(splitted.length-1))
                        current=current[field];
                    else current[field].push(value);
                }
            }

        }
    }

}

ConfigManager.prototype.getValue=function(data,path)
{

    if(data!=undefined && path!=undefined)
    {
        var splitted=path.split('.');
        var current= data;

        for(var i in splitted)
        {
            var field=splitted[i];

            var squareIndex=field.indexOf('[');
            if(squareIndex>-1)
            {
                var squareSplitted=field.split('[');

                var arrayIndex=parseInt(squareSplitted[1].slice(0,squareSplitted[1].indexOf(']')));

                if(current[squareSplitted[0]]!=undefined &&
                    current[squareSplitted[0]][arrayIndex]!=undefined)
                {
                        current=current[squareSplitted[0]][arrayIndex];
                }
            }
            else{
                if(current[field]!=undefined)
                {
                    current=current[field];
                }
            }

        }

        return current;
    }

}